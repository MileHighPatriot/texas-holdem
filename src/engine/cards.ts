import { rngInt } from './rng'
import type { Card, Rank, RngState, Suit } from './types'

export const SUITS: Suit[] = ['s', 'h', 'd', 'c']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const RANK_CHARS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export const RANK_NAMES: Record<Rank, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
}

export const RANK_PLURALS: Record<Rank, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
}

export const SUIT_NAMES: Record<Suit, string> = {
  s: 'Spades',
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs',
}

export const SUIT_GLYPHS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
}

const CHAR_TO_RANK: Record<string, Rank> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  t: 10,
  J: 11,
  j: 11,
  Q: 12,
  q: 12,
  K: 13,
  k: 13,
  A: 14,
  a: 14,
}

const CHAR_TO_SUIT: Record<string, Suit> = {
  s: 's',
  S: 's',
  h: 'h',
  H: 'h',
  d: 'd',
  D: 'd',
  c: 'c',
  C: 'c',
}

export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit }
}

export function formatCard(c: Card): string {
  return `${RANK_CHARS[c.rank]}${c.suit}`
}

export function parseCard(text: string): Card {
  const trimmed = text.trim()
  if (trimmed.length < 2) {
    throw new Error(`Invalid card: "${text}"`)
  }
  const rank = CHAR_TO_RANK[trimmed[0]!]
  const suit = CHAR_TO_SUIT[trimmed[1]!]
  if (!rank || !suit) {
    throw new Error(`Invalid card: "${text}"`)
  }
  return { rank, suit }
}

export function parseCards(text: string): Card[] {
  return text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(parseCard)
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffle(deck: Card[], rng: RngState): Card[] {
  const next = deck.slice()
  for (let i = next.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1)
    const tmp = next[i]!
    next[i] = next[j]!
    next[j] = tmp
  }
  return next
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit
}

export function cloneCard(c: Card): Card {
  return { rank: c.rank, suit: c.suit }
}
