import { createDeck, shuffle } from './cards'
import { canStillAct, isBettingStreet, streetComplete, validateAction } from './legal'
import {
  awardPots,
  cloneState,
  liveSeats,
  nextMatching,
  playersWithChips,
  returnUncalledBet,
  revealShowdown,
} from './pots'
import { createRng } from './rng'
import type {
  ApplyResult,
  GameEvent,
  GameState,
  PlayerAction,
  Seat,
  TableConfig,
} from './types'

export { legalActions, streetComplete } from './legal'

function freshSeat(
  index: number,
  player: TableConfig['players'][number],
): Seat {
  return {
    index,
    id: player.id,
    name: player.name,
    isHuman: player.isHuman,
    chips: player.chips,
    hole: null,
    status: player.chips > 0 ? 'sitting-out' : 'sitting-out',
    streetCommitted: 0,
    handCommitted: 0,
    actedThisStreet: false,
    revealed: false,
  }
}

export function createTable(config: TableConfig): GameState {
  if (config.players.length < 2 || config.players.length > 9) {
    throw new Error('Table needs 2–9 players.')
  }
  if (config.smallBlind <= 0 || config.bigBlind < config.smallBlind) {
    throw new Error('Invalid blinds.')
  }

  const seed = config.seed ?? Math.floor(Math.random() * 0xffffffff)
  const seats = config.players.map((player, index) => freshSeat(index, player))

  return {
    version: 1,
    seed,
    rng: createRng(seed),
    handNumber: 0,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    button: seats.length - 1,
    sbIndex: null,
    bbIndex: null,
    street: 'idle',
    board: [],
    deck: [],
    deckIndex: 0,
    seats,
    currentToAct: null,
    currentBet: 0,
    lastFullRaiseSize: config.bigBlind,
    lastAggressor: null,
    pots: [],
    awards: [],
    winners: [],
  }
}

function dealCard(state: GameState): GameState['deck'][number] {
  const card = state.deck[state.deckIndex]
  if (!card) throw new Error('Deck exhausted.')
  state.deckIndex += 1
  return card
}

function burn(state: GameState): void {
  if (state.deckIndex < state.deck.length) state.deckIndex += 1
}

function commit(seat: Seat, amount: number): number {
  const pay = Math.min(amount, seat.chips)
  seat.chips -= pay
  seat.streetCommitted += pay
  seat.handCommitted += pay
  if (seat.chips === 0) {
    seat.status = 'all-in'
    seat.actedThisStreet = true
  }
  return pay
}

function inComingHand(seat: Seat): boolean {
  return seat.status !== 'empty' && seat.chips > 0
}

function rotateButton(state: GameState): void {
  const next = nextMatching(state, state.button, inComingHand)
  if (next !== null) state.button = next
}

function assignBlinds(state: GameState): { sb: number; bb: number } {
  const inHand = playersWithChips(state)
  if (inHand.length === 2) {
    const sb = state.button
    const bb = nextMatching(state, sb, inComingHand)
    if (bb === null) throw new Error('Missing big blind.')
    return { sb, bb }
  }
  const sb = nextMatching(state, state.button, inComingHand)
  if (sb === null) throw new Error('Missing small blind.')
  const bb = nextMatching(state, sb, inComingHand)
  if (bb === null) throw new Error('Missing big blind.')
  return { sb, bb }
}

function resetForHand(state: GameState): void {
  for (const seat of state.seats) {
    if (seat.status === 'empty') continue
    seat.hole = null
    seat.streetCommitted = 0
    seat.handCommitted = 0
    seat.actedThisStreet = false
    seat.revealed = false
    seat.status = seat.chips > 0 ? 'active' : 'sitting-out'
  }
  state.board = []
  state.deck = shuffle(createDeck(), state.rng)
  state.deckIndex = 0
  state.currentBet = 0
  state.lastFullRaiseSize = state.bigBlind
  state.lastAggressor = null
  state.pots = []
  state.awards = []
  state.winners = []
  state.currentToAct = null
}

function dealHoles(state: GameState): void {
  const order: number[] = []
  let idx = nextMatching(state, state.button, (s) => s.status === 'active')
  const guard = state.seats.length
  for (let n = 0; n < guard && idx !== null; n++) {
    if (!order.includes(idx)) order.push(idx)
    idx = nextMatching(state, idx, (s) => s.status === 'active')
    if (idx === order[0]) break
  }

  for (let hole = 0; hole < 2; hole++) {
    for (const seatIndex of order) {
      const card = dealCard(state)
      const seat = state.seats[seatIndex]!
      if (!seat.hole) seat.hole = [card, card]
      else seat.hole[hole] = card
    }
  }
}

function firstToAct(state: GameState, from: number): number | null {
  return nextMatching(state, from, (s) => canStillAct(state, s))
}

function finishByFold(state: GameState, events: GameEvent[]): GameState {
  const refunded = returnUncalledBet(state)
  state = refunded.state
  if (refunded.returned) {
    events.push({
      type: 'uncalled-returned',
      seat: refunded.returned.seat,
      amount: refunded.returned.amount,
    })
  }
  const awarded = awardPots(state, true)
  state = awarded.state
  state.street = 'hand-complete'
  state.currentToAct = null
  events.push({ type: 'showdown', awards: awarded.awards })
  events.push({ type: 'hand-complete', winners: awarded.winners })
  return state
}

function runShowdown(state: GameState, events: GameEvent[]): GameState {
  state = revealShowdown(state)
  const awarded = awardPots(state, false)
  state = awarded.state
  state.street = 'showdown'
  state.currentToAct = null
  events.push({ type: 'showdown', awards: awarded.awards })
  events.push({ type: 'hand-complete', winners: awarded.winners })
  return state
}

export function fundedPlayers(state: GameState): Seat[] {
  return state.seats.filter((s) => s.status !== 'empty' && s.chips > 0)
}

export function startHand(state: GameState, options?: { deck?: GameState['deck'] }): ApplyResult {
  const events: GameEvent[] = []
  let next = cloneState(state)

  const funded = fundedPlayers(next)
  if (funded.length < 2) {
    next.street = 'idle'
    next.currentToAct = null
    events.push({ type: 'game-over', reason: 'one-player-left' })
    return { state: next, events }
  }

  if (next.handNumber > 0) rotateButton(next)
  resetForHand(next)
  if (options?.deck) {
    next.deck = options.deck.map((c) => ({ ...c }))
    next.deckIndex = 0
  }
  next.handNumber += 1

  const { sb, bb } = assignBlinds(next)
  next.sbIndex = sb
  next.bbIndex = bb

  const sbPaid = commit(next.seats[sb]!, next.smallBlind)
  const bbPaid = commit(next.seats[bb]!, next.bigBlind)

  next.currentBet = next.bigBlind
  next.lastFullRaiseSize = next.bigBlind
  next.lastAggressor = bb
  next.street = 'preflop'

  events.push({ type: 'hand-started', handNumber: next.handNumber, button: next.button })
  events.push({
    type: 'blinds-posted',
    posts: [
      { seat: sb, amount: sbPaid, kind: 'sb' },
      { seat: bb, amount: bbPaid, kind: 'bb' },
    ],
  })

  dealHoles(next)
  events.push({ type: 'hole-dealt' })

  if (streetComplete(next)) {
    next.currentToAct = null
  } else {
    next.currentToAct = firstToAct(next, bb)
  }

  return { state: next, events }
}

function applyRaiseTo(state: GameState, seat: Seat, raiseTo: number): void {
  const needed = Math.max(0, raiseTo - seat.streetCommitted)
  commit(seat, needed)
  const newBet = seat.streetCommitted
  const raiseSize = newBet - state.currentBet
  const isRaise = newBet > state.currentBet

  if (isRaise) {
    const fullRaise = raiseSize >= state.lastFullRaiseSize
    state.currentBet = newBet
    state.lastAggressor = seat.index
    if (fullRaise) {
      state.lastFullRaiseSize = raiseSize
      for (const other of state.seats) {
        if (other.index === seat.index) continue
        if (other.status === 'active' && other.chips > 0) {
          other.actedThisStreet = false
        }
      }
    }
  }

  seat.actedThisStreet = true
}

export function applyAction(state: GameState, seatIndex: number, action: PlayerAction): ApplyResult {
  const error = validateAction(state, seatIndex, action)
  if (error) return { state, events: [], error }

  const events: GameEvent[] = []
  const next = cloneState(state)
  const seat = next.seats[seatIndex]!

  let committed = 0
  switch (action.type) {
    case 'fold':
      seat.status = 'folded'
      seat.actedThisStreet = true
      break
    case 'check':
      seat.actedThisStreet = true
      break
    case 'call': {
      const needed = Math.max(0, next.currentBet - seat.streetCommitted)
      committed = commit(seat, needed)
      seat.actedThisStreet = true
      break
    }
    case 'all-in':
      applyRaiseTo(next, seat, seat.streetCommitted + seat.chips)
      committed = seat.streetCommitted
      break
    case 'raise-to':
      applyRaiseTo(next, seat, action.amount)
      committed = seat.streetCommitted
      break
  }

  events.push({ type: 'action', seat: seatIndex, action, committed })

  const live = liveSeats(next)
  if (live.length <= 1) {
    return { state: finishByFold(next, events), events }
  }

  if (streetComplete(next)) {
    next.currentToAct = null
  } else {
    next.currentToAct = firstToAct(next, seatIndex)
    if (next.currentToAct === null) next.currentToAct = null
  }

  return { state: next, events }
}

function dealStreet(state: GameState, street: 'flop' | 'turn' | 'river'): GameEvent {
  burn(state)
  const cards = street === 'flop' ? [dealCard(state), dealCard(state), dealCard(state)] : [dealCard(state)]
  state.board.push(...cards)
  return { type: 'street-dealt', street, cards }
}

function openStreet(state: GameState): void {
  for (const seat of state.seats) {
    seat.streetCommitted = 0
    seat.actedThisStreet = false
  }
  state.currentBet = 0
  state.lastFullRaiseSize = state.bigBlind
  state.lastAggressor = null

  if (streetComplete(state)) {
    state.currentToAct = null
  } else {
    state.currentToAct = firstToAct(state, state.button)
  }
}

/**
 * Advance the hand exactly one step when betting on the current street is done:
 * deal the next community cards, or go to showdown.
 */
export function continueHand(state: GameState): ApplyResult {
  const events: GameEvent[] = []
  let next = cloneState(state)

  if (next.street === 'idle' || next.street === 'hand-complete' || next.street === 'showdown') {
    return { state: next, events }
  }

  if (next.currentToAct !== null) {
    return { state: next, events }
  }

  const live = liveSeats(next)
  if (live.length <= 1) {
    return { state: finishByFold(next, events), events }
  }

  if (next.street === 'preflop') {
    events.push(dealStreet(next, 'flop'))
    next.street = 'flop'
    openStreet(next)
    return { state: next, events }
  }
  if (next.street === 'flop') {
    events.push(dealStreet(next, 'turn'))
    next.street = 'turn'
    openStreet(next)
    return { state: next, events }
  }
  if (next.street === 'turn') {
    events.push(dealStreet(next, 'river'))
    next.street = 'river'
    openStreet(next)
    return { state: next, events }
  }

  return { state: runShowdown(next, events), events }
}

export function needsContinue(state: GameState): boolean {
  if (!isBettingStreet(state.street)) return false
  return state.currentToAct === null
}

export function rebuy(state: GameState, seatIndex: number, amount: number): ApplyResult {
  const next = cloneState(state)
  const seat = next.seats[seatIndex]
  if (!seat || seat.status === 'empty') {
    return { state, events: [], error: 'No such seat.' }
  }
  if (amount <= 0) return { state, events: [], error: 'Invalid rebuy.' }
  if (next.street !== 'idle' && next.street !== 'hand-complete' && next.street !== 'showdown') {
    if (seat.status === 'active' || seat.status === 'all-in' || seat.status === 'folded') {
      return { state, events: [], error: 'Wait for the hand to finish.' }
    }
  }
  seat.chips += amount
  if (seat.status === 'sitting-out') seat.status = 'sitting-out'
  return { state: next, events: [] }
}
