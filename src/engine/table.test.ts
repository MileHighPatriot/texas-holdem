import { describe, expect, it } from 'vitest'
import { parseCards } from './cards'
import { legalActions } from './legal'
import { applyAction, continueHand, createTable, startHand } from './table'
import type { GameState, PlayerAction } from './types'

function table(players = 3, chips = 1000) {
  return createTable({
    smallBlind: 10,
    bigBlind: 20,
    seed: 1,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      isHuman: i === 0,
      chips,
    })),
  })
}

function act(state: GameState, action: PlayerAction): GameState {
  const result = applyAction(state, state.currentToAct!, action)
  if (result.error) throw new Error(result.error)
  return result.state
}

function drainStreet(state: GameState, prefer: 'check' | 'call' = 'check'): GameState {
  let next = state
  while (next.currentToAct !== null) {
    const legal = legalActions(next, next.currentToAct)!
    if (prefer === 'check' && legal.canCheck) next = act(next, { type: 'check' })
    else if (legal.canCall) next = act(next, { type: 'call' })
    else if (legal.canCheck) next = act(next, { type: 'check' })
    else next = act(next, { type: 'all-in' })
  }
  return next
}

describe('table flow', () => {
  it('posts blinds and starts action left of the big blind', () => {
    const started = startHand(table(3)).state
    expect(started.street).toBe('preflop')
    expect(started.button).toBe(2)
    expect(started.sbIndex).toBe(0)
    expect(started.bbIndex).toBe(1)
    expect(started.seats[0]!.handCommitted).toBe(10)
    expect(started.seats[1]!.handCommitted).toBe(20)
    expect(started.currentToAct).toBe(2)
    expect(started.currentBet).toBe(20)
  })

  it('uses heads-up blind rules: button is SB and acts first preflop', () => {
    const started = startHand(table(2)).state
    expect(started.button).toBe(1)
    expect(started.sbIndex).toBe(1)
    expect(started.bbIndex).toBe(0)
    expect(started.currentToAct).toBe(1)
  })

  it('awards the pot when everyone folds to the big blind', () => {
    let state = startHand(table(3)).state
    state = act(state, { type: 'fold' })
    state = act(state, { type: 'fold' })
    expect(state.street).toBe('hand-complete')
    expect(state.winners).toHaveLength(1)
    expect(state.winners[0]!.seat).toBe(1)
    expect(state.winners[0]!.foldedWin).toBe(true)
    expect(state.seats[1]!.chips).toBe(1010)
    expect(state.seats[0]!.chips).toBe(990)
    expect(state.seats[2]!.chips).toBe(1000)
  })

  it('returns an uncalled raise when the rest fold', () => {
    let state = startHand(table(3)).state
    state = act(state, { type: 'raise-to', amount: 200 })
    state = act(state, { type: 'fold' })
    state = act(state, { type: 'fold' })
    expect(state.street).toBe('hand-complete')
    expect(state.seats[2]!.chips).toBe(1030)
    expect(state.seats[0]!.chips).toBe(990)
    expect(state.seats[1]!.chips).toBe(980)
  })

  it('deals the flop after a limp around and BB check', () => {
    let state = startHand(table(3)).state
    state = act(state, { type: 'call' })
    state = act(state, { type: 'call' })
    expect(legalActions(state, 1)?.canCheck).toBe(true)
    state = act(state, { type: 'check' })
    expect(state.currentToAct).toBeNull()
    state = continueHand(state).state
    expect(state.street).toBe('flop')
    expect(state.board).toHaveLength(3)
    expect(state.currentBet).toBe(0)
    expect(state.currentToAct).toBe(0)
  })

  it('runs out remaining streets when players are all-in', () => {
    let state = startHand(table(2, 100)).state
    state = act(state, { type: 'all-in' })
    state = act(state, { type: 'call' })
    expect(state.currentToAct).toBeNull()
    state = continueHand(state).state
    expect(state.street).toBe('flop')
    expect(state.currentToAct).toBeNull()
    state = continueHand(state).state
    expect(state.street).toBe('turn')
    state = continueHand(state).state
    expect(state.street).toBe('river')
    state = continueHand(state).state
    expect(state.street).toBe('showdown')
    expect(state.board).toHaveLength(5)
    expect(state.winners.length).toBeGreaterThan(0)
    const totalChips = state.seats.reduce((sum, s) => sum + s.chips, 0)
    expect(totalChips).toBe(200)
  })

  it('does not reopen raising after a short all-in', () => {
    let state = startHand(table(3, 1000)).state
    state = drainStreet(state, 'call')
    state = continueHand(state).state
    expect(state.street).toBe('flop')
    expect(state.currentToAct).toBe(0)
    state = act(state, { type: 'raise-to', amount: 100 })
    state = act(state, { type: 'call' })
    const short = {
      ...state,
      seats: state.seats.map((s) => (s.index === 2 ? { ...s, chips: 130 } : s)),
    }
    const afterShort = applyAction(short, 2, { type: 'all-in' })
    expect(afterShort.error).toBeUndefined()
    state = afterShort.state
    expect(state.currentToAct).toBe(0)
    const openerLegal = legalActions(state, 0)
    expect(openerLegal?.canCall).toBe(true)
    expect(openerLegal?.canRaise).toBe(false)
  })

  it('awards the pot to the best 7-card hand at showdown', () => {
    const deck = parseCards(
      [
        'As',
        'Kd',
        '2c',
        'Ah',
        'Kc',
        '3d',
        '9s',
        'Ad',
        'Ac',
        '7h',
        '8s',
        '4c',
        '5d',
        '6h',
        '9c',
      ].join(' '),
    )
    let state = startHand(table(3), { deck }).state
    expect(state.seats[0]!.hole).toEqual(parseCards('As Ah'))
    expect(state.seats[1]!.hole).toEqual(parseCards('Kd Kc'))
    expect(state.seats[2]!.hole).toEqual(parseCards('2c 3d'))
    state = drainStreet(state, 'call')
    state = continueHand(state).state
    state = drainStreet(state)
    state = continueHand(state).state
    state = drainStreet(state)
    state = continueHand(state).state
    state = drainStreet(state)
    state = continueHand(state).state
    expect(state.street).toBe('showdown')
    expect(state.winners[0]!.seat).toBe(0)
    expect(state.winners[0]!.hand?.category).toBe('four-of-a-kind')
  })

  it('splits the pot when both players play the same board nuts', () => {
    const deck = parseCards(
      [
        '2c',
        '3d',
        '2h',
        '3s',
        '4h',
        'As',
        'Ks',
        'Qs',
        '5h',
        'Js',
        '6h',
        'Ts',
      ].join(' '),
    )
    let state = startHand(table(2), { deck }).state
    state = drainStreet(state, 'call')
    for (let i = 0; i < 4; i++) {
      state = continueHand(state).state
      if (state.currentToAct !== null) state = drainStreet(state)
    }
    expect(state.street).toBe('showdown')
    expect(state.winners).toHaveLength(2)
    expect(state.winners[0]!.amount).toBe(20)
    expect(state.winners[1]!.amount).toBe(20)
  })
})
