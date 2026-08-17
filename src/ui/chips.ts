export const CHIP_DENOMS = [
  { value: 1000, name: 'yellow' },
  { value: 500, name: 'purple' },
  { value: 100, name: 'black' },
  { value: 25, name: 'green' },
  { value: 5, name: 'red' },
  { value: 1, name: 'white' },
] as const

export type ChipColor = (typeof CHIP_DENOMS)[number]['name']

export interface ChipPile {
  value: number
  name: ChipColor
  count: number
}

const MAX_PER_PILE = 8
const MAX_PILES = 5

/** Break a chip amount into visual piles. Caps height so huge bets still fit. */
export function pilesForAmount(amount: number): ChipPile[] {
  if (amount <= 0) return []
  let remaining = Math.floor(amount)
  const piles: ChipPile[] = []
  for (const denom of CHIP_DENOMS) {
    let count = Math.floor(remaining / denom.value)
    if (count === 0) continue
    remaining -= count * denom.value
    while (count > 0 && piles.length < MAX_PILES) {
      const take = Math.min(count, MAX_PER_PILE)
      piles.push({ value: denom.value, name: denom.name, count: take })
      count -= take
    }
  }
  return piles
}
