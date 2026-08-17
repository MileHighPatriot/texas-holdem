import type { GameState, LegalActions, PlayerAction, Seat } from './types'

export function isBettingStreet(street: GameState['street']): boolean {
  return street === 'preflop' || street === 'flop' || street === 'turn' || street === 'river'
}

export function canStillAct(state: GameState, seat: Seat): boolean {
  if (seat.status !== 'active' || seat.chips <= 0) return false
  if (seat.streetCommitted < state.currentBet) return true
  return !seat.actedThisStreet
}

export function actorsWhoCanBet(state: GameState): Seat[] {
  return state.seats.filter((s) => s.status === 'active' && s.chips > 0)
}

export function streetComplete(state: GameState): boolean {
  const live = state.seats.filter((s) => s.status === 'active' || s.status === 'all-in')
  if (live.length <= 1) return true

  const mustAct = live.filter((s) => s.status === 'active' && s.chips > 0)
  if (mustAct.length < 2) {
    if (mustAct.length === 1 && mustAct[0]!.streetCommitted < state.currentBet) return false
    return true
  }

  for (const seat of mustAct) {
    if (seat.streetCommitted < state.currentBet) return false
    if (!seat.actedThisStreet) return false
  }
  return true
}

export function legalActions(state: GameState, seatIndex: number): LegalActions | null {
  if (!isBettingStreet(state.street)) return null
  if (state.currentToAct !== seatIndex) return null

  const seat = state.seats[seatIndex]
  if (!seat || seat.status !== 'active' || seat.chips <= 0) return null

  const facingBet = state.currentBet > seat.streetCommitted
  const toCall = Math.max(0, state.currentBet - seat.streetCommitted)
  const callAmount = Math.min(toCall, seat.chips)
  const maxRaiseTo = seat.streetCommitted + seat.chips
  const facingIncomplete = seat.actedThisStreet && facingBet
  const minRaiseTo = state.currentBet + state.lastFullRaiseSize

  const canCheck = !facingBet
  const canCall = facingBet && callAmount > 0
  const canBet = !facingBet && seat.chips > 0 && actorsWhoCanBet(state).length >= 2
  const canRaise =
    facingBet &&
    !facingIncomplete &&
    maxRaiseTo > state.currentBet &&
    actorsWhoCanBet(state).length >= 2

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canBet,
    canRaise,
    minRaiseTo: canBet ? Math.min(state.bigBlind, maxRaiseTo) : minRaiseTo,
    maxRaiseTo,
    canAllIn: seat.chips > 0,
    facingBet,
  }
}

export function validateAction(
  state: GameState,
  seatIndex: number,
  action: PlayerAction,
): string | null {
  const legal = legalActions(state, seatIndex)
  if (!legal) return 'It is not this seat’s turn.'

  switch (action.type) {
    case 'fold':
      return legal.canFold ? null : 'Cannot fold.'
    case 'check':
      return legal.canCheck ? null : 'Cannot check.'
    case 'call':
      return legal.canCall ? null : 'Cannot call.'
    case 'all-in':
      return legal.canAllIn ? null : 'Cannot go all-in.'
    case 'raise-to': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return 'Invalid amount.'
      if (!legal.canBet && !legal.canRaise) {
        if (action.amount === legal.maxRaiseTo && legal.canAllIn) return null
        return 'Cannot bet or raise.'
      }
      const minTo = legal.minRaiseTo
      if (action.amount < minTo && action.amount !== legal.maxRaiseTo) {
        return `Minimum is ${minTo}.`
      }
      if (action.amount > legal.maxRaiseTo) return 'Not enough chips.'
      return null
    }
  }
}
