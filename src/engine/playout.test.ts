import { describe, expect, it } from 'vitest'
import { personalityFor, chooseAction } from '../ai/policy'
import { applyAction, continueHand, createTable, needsContinue, publicView, startHand } from './index'

describe('full playouts', () => {
  it('plays many hands without losing chips or hanging', () => {
    let state = createTable({
      smallBlind: 10,
      bigBlind: 20,
      seed: 20260815,
      players: [
        { id: 'a', name: 'A', isHuman: false, chips: 1000 },
        { id: 'b', name: 'B', isHuman: false, chips: 1000 },
        { id: 'c', name: 'C', isHuman: false, chips: 1000 },
        { id: 'd', name: 'D', isHuman: false, chips: 1000 },
      ],
    })

    const bankroll = () =>
      state.seats.reduce((sum, s) => sum + s.chips + s.handCommitted, 0)

    expect(bankroll()).toBe(4000)

    let hands = 0
    for (let i = 0; i < 30; i++) {
      const started = startHand(state)
      state = started.state
      if (state.street === 'idle') break
      hands += 1
      let guard = 0
      while (state.street !== 'showdown' && state.street !== 'hand-complete' && guard < 250) {
        guard += 1
        expect(bankroll()).toBe(4000)
        if (needsContinue(state)) {
          state = continueHand(state).state
          continue
        }
        const idx = state.currentToAct
        expect(idx).not.toBeNull()
        const view = publicView(state, idx!)
        expect(view.legal).not.toBeNull()
        const rng = () => ((guard * 17 + i * 13 + idx!) % 100) / 100
        const action = chooseAction(view, view.legal!, personalityFor(`p${idx}`, 'balanced', 0), rng)
        const result = applyAction(state, idx!, action)
        if (result.error) {
          throw new Error(result.error)
        }
        state = result.state
      }
      expect(guard).toBeLessThan(250)
      expect(bankroll()).toBe(4000)
    }

    expect(hands).toBeGreaterThan(5)
    expect(state.seats.reduce((sum, s) => sum + s.chips, 0)).toBe(4000)
  })
})
