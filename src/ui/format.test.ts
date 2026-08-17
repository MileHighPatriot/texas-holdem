import { describe, expect, it } from 'vitest'
import { parseCard } from '../engine/cards'
import { rankGlyph } from './format'

describe('rankGlyph', () => {
  it('shows a real ten, not T', () => {
    expect(rankGlyph(parseCard('Ts'))).toBe('10')
    expect(rankGlyph(parseCard('Td'))).toBe('10')
  })

  it('uses standard face letters for the rest of the deck', () => {
    expect(rankGlyph(parseCard('As'))).toBe('A')
    expect(rankGlyph(parseCard('Kh'))).toBe('K')
    expect(rankGlyph(parseCard('Qc'))).toBe('Q')
    expect(rankGlyph(parseCard('Jd'))).toBe('J')
    expect(rankGlyph(parseCard('9s'))).toBe('9')
    expect(rankGlyph(parseCard('2c'))).toBe('2')
  })
})
