import { SUIT_GLYPHS } from '../engine/cards'
import type { Card, Street } from '../engine/types'

export function formatChips(amount: number): string {
  return amount.toLocaleString('en-US')
}

export function streetLabel(street: Street): string {
  switch (street) {
    case 'preflop':
      return 'Preflop'
    case 'flop':
      return 'Flop'
    case 'turn':
      return 'Turn'
    case 'river':
      return 'River'
    case 'showdown':
      return 'Showdown'
    case 'hand-complete':
      return 'Hand over'
    case 'idle':
      return 'Ready'
  }
}

export function isRedSuit(card: Card): boolean {
  return card.suit === 'h' || card.suit === 'd'
}

export const RANK_FACE: Record<Card['rank'], string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export function rankGlyph(card: Card): string {
  return RANK_FACE[card.rank]
}

export function suitGlyph(card: Card): string {
  return SUIT_GLYPHS[card.suit]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function seatAccent(index: number): string {
  const palette = ['#d4b46a', '#7eb6c9', '#d07a7a', '#8fbf88', '#c49bdc', '#e0a36a']
  return palette[index % palette.length]!
}

export function seatPosition(index: number, heroIndex: number, count: number): {
  left: string
  top: string
} {
  const visual = (index - heroIndex + count) % count

  if (count <= 2) {
    return visual === 0 ? { left: '50%', top: '88%' } : { left: '50%', top: '9%' }
  }

  if (count === 4) {
    const spots = [
      { left: '50%', top: '88%' },
      { left: '7%', top: '24%' },
      { left: '50%', top: '9%' },
      { left: '93%', top: '24%' },
    ]
    return spots[visual]!
  }

  const angle = Math.PI / 2 + (visual / count) * 2 * Math.PI
  const rx = 47
  const ry = 41
  return {
    left: `${50 + Math.cos(angle) * rx}%`,
    top: `${50 + Math.sin(angle) * ry}%`,
  }
}
