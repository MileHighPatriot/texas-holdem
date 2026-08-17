import { describe, expect, it } from 'vitest'
import { buildPots } from './pots'
import type { Seat, SeatStatus } from './types'

function seat(partial: Partial<Seat> & { index: number; handCommitted: number; status: SeatStatus }): Seat {
  return {
    id: `p${partial.index}`,
    name: `P${partial.index}`,
    isHuman: false,
    chips: 0,
    hole: null,
    streetCommitted: 0,
    actedThisStreet: true,
    revealed: false,
    ...partial,
  }
}

describe('buildPots', () => {
  it('builds a single pot when everyone commits the same amount', () => {
    const pots = buildPots([
      seat({ index: 0, handCommitted: 100, status: 'active' }),
      seat({ index: 1, handCommitted: 100, status: 'active' }),
      seat({ index: 2, handCommitted: 100, status: 'folded' }),
    ])
    expect(pots).toHaveLength(1)
    expect(pots[0]!.amount).toBe(300)
    expect(pots[0]!.eligible).toEqual([0, 1])
    expect(pots[0]!.label).toBe('Main pot')
  })

  it('creates a side pot when a player is all-in short', () => {
    const pots = buildPots([
      seat({ index: 0, handCommitted: 50, status: 'all-in' }),
      seat({ index: 1, handCommitted: 200, status: 'active' }),
      seat({ index: 2, handCommitted: 200, status: 'active' }),
    ])
    expect(pots).toHaveLength(2)
    expect(pots[0]!.amount).toBe(150)
    expect(pots[0]!.eligible).toEqual([0, 1, 2])
    expect(pots[1]!.amount).toBe(300)
    expect(pots[1]!.eligible).toEqual([1, 2])
    expect(pots[1]!.label).toBe('Side pot 1')
  })

  it('keeps folded chips in the pot but not as eligible winners', () => {
    const pots = buildPots([
      seat({ index: 0, handCommitted: 80, status: 'folded' }),
      seat({ index: 1, handCommitted: 200, status: 'all-in' }),
      seat({ index: 2, handCommitted: 200, status: 'active' }),
    ])
    expect(pots[0]!.amount).toBe(240)
    expect(pots[0]!.eligible).toEqual([1, 2])
    expect(pots[1]!.amount).toBe(240)
    expect(pots[1]!.eligible).toEqual([1, 2])
  })
})
