import { describe, expect, it } from 'vitest'
import { pilesForAmount } from './chips'

describe('pilesForAmount', () => {
  it('returns nothing for empty bets', () => {
    expect(pilesForAmount(0)).toEqual([])
    expect(pilesForAmount(-4)).toEqual([])
  })

  it('breaks a mixed bet into casino denominations', () => {
    expect(pilesForAmount(37)).toEqual([
      { value: 25, name: 'green', count: 1 },
      { value: 5, name: 'red', count: 2 },
      { value: 1, name: 'white', count: 2 },
    ])
  })

  it('caps pile height so large bets stay readable', () => {
    const piles = pilesForAmount(10_000)
    expect(piles.every((p) => p.count <= 8)).toBe(true)
    expect(piles.length).toBeLessThanOrEqual(5)
  })
})
