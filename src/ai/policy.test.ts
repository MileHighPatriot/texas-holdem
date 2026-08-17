import { describe, expect, it } from 'vitest'
import { parseCard } from '../engine/cards'
import { holeStrength } from './policy'

describe('holeStrength', () => {
  it('ranks premium pairs above suited connectors', () => {
    const aa = holeStrength(parseCard('As'), parseCard('Ad'))
    const kk = holeStrength(parseCard('Ks'), parseCard('Kd'))
    const jTs = holeStrength(parseCard('Js'), parseCard('Ts'))
    const sevenTwo = holeStrength(parseCard('7c'), parseCard('2d'))
    expect(aa).toBeGreaterThan(kk)
    expect(kk).toBeGreaterThan(jTs)
    expect(jTs).toBeGreaterThan(sevenTwo)
  })
})
