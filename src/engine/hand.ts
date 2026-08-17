import { RANK_NAMES, RANK_PLURALS } from './cards'
import type { Card, EvaluatedHand, HandCategory, Rank } from './types'

const CATEGORY_RANK: Record<HandCategory, number> = {
  'high-card': 0,
  pair: 1,
  'two-pair': 2,
  'three-of-a-kind': 3,
  straight: 4,
  flush: 5,
  'full-house': 6,
  'four-of-a-kind': 7,
  'straight-flush': 8,
  'royal-flush': 9,
}

const RANK_BASE = 15

export function packRank(categoryRank: number, ranks: number[]): number {
  let value = categoryRank
  for (let i = 0; i < 5; i++) {
    value = value * RANK_BASE + (ranks[i] ?? 0)
  }
  return value
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.rankValue - b.rankValue
}

function asRank(n: number): Rank {
  return n as Rank
}

function handName(category: HandCategory, ranks: number[]): string {
  const high = ranks[0] ?? 2
  const second = ranks[1] ?? 2
  switch (category) {
    case 'royal-flush':
      return 'Royal Flush'
    case 'straight-flush':
      return `Straight Flush, ${RANK_NAMES[asRank(high)]} high`
    case 'four-of-a-kind':
      return `Four of a Kind, ${RANK_PLURALS[asRank(high)]}`
    case 'full-house':
      return `Full House, ${RANK_PLURALS[asRank(high)]} full of ${RANK_PLURALS[asRank(second)]}`
    case 'flush':
      return `Flush, ${RANK_NAMES[asRank(high)]} high`
    case 'straight':
      return `Straight, ${RANK_NAMES[asRank(high)]} high`
    case 'three-of-a-kind':
      return `Three of a Kind, ${RANK_PLURALS[asRank(high)]}`
    case 'two-pair':
      return `Two Pair, ${RANK_PLURALS[asRank(high)]} and ${RANK_PLURALS[asRank(second)]}`
    case 'pair':
      return `Pair of ${RANK_PLURALS[asRank(high)]}`
    case 'high-card':
      return `${RANK_NAMES[asRank(high)]} high`
  }
}

function makeHand(category: HandCategory, ranks: number[], cards: Card[]): EvaluatedHand {
  const categoryRank = CATEGORY_RANK[category]
  return {
    category,
    categoryRank,
    ranks,
    rankValue: packRank(categoryRank, ranks),
    cards,
    name: handName(category, ranks),
  }
}

function straightHighFromRanks(sortedDesc: number[]): number | null {
  const unique = [...new Set(sortedDesc)]
  if (unique.length < 5) return null
  if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
    return 5
  }
  if (unique[0]! - unique[4]! === 4) {
    return unique[0]!
  }
  return null
}

function pickByRanks(cards: Card[], rankOrder: number[], counts: Record<number, number>): Card[] {
  const remaining = cards.slice()
  const picked: Card[] = []
  for (const rank of rankOrder) {
    const need = counts[rank] ?? 1
    for (let n = 0; n < need; n++) {
      const idx = remaining.findIndex((c) => c.rank === rank)
      if (idx >= 0) picked.push(remaining.splice(idx, 1)[0]!)
    }
  }
  return picked
}

export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error(`evaluateFive expects 5 cards, got ${cards.length}`)
  }

  const sorted = cards.slice().sort((a, b) => b.rank - a.rank)
  const ranks = sorted.map((c) => c.rank)
  const flush = sorted.every((c) => c.suit === sorted[0]!.suit)
  const straightHigh = straightHighFromRanks(ranks)

  const countByRank = new Map<number, number>()
  for (const rank of ranks) {
    countByRank.set(rank, (countByRank.get(rank) ?? 0) + 1)
  }
  const groups = [...countByRank.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank)

  if (flush && straightHigh === 14) {
    return makeHand('royal-flush', [14, 13, 12, 11, 10], sorted)
  }

  if (flush && straightHigh !== null) {
    const order =
      straightHigh === 5
        ? [5, 4, 3, 2, 14]
        : [straightHigh, straightHigh - 1, straightHigh - 2, straightHigh - 3, straightHigh - 4]
    return makeHand(
      'straight-flush',
      [straightHigh],
      pickByRanks(sorted, order, Object.fromEntries(order.map((r) => [r, 1]))),
    )
  }

  if (groups[0]!.count === 4) {
    const quad = groups[0]!.rank
    const kicker = groups[1]!.rank
    return makeHand(
      'four-of-a-kind',
      [quad, kicker],
      pickByRanks(sorted, [quad, kicker], { [quad]: 4, [kicker]: 1 }),
    )
  }

  if (groups[0]!.count === 3 && groups[1]!.count === 2) {
    const trips = groups[0]!.rank
    const pair = groups[1]!.rank
    return makeHand(
      'full-house',
      [trips, pair],
      pickByRanks(sorted, [trips, pair], { [trips]: 3, [pair]: 2 }),
    )
  }

  if (flush) {
    return makeHand('flush', ranks, sorted)
  }

  if (straightHigh !== null) {
    const order =
      straightHigh === 5
        ? [5, 4, 3, 2, 14]
        : [straightHigh, straightHigh - 1, straightHigh - 2, straightHigh - 3, straightHigh - 4]
    return makeHand(
      'straight',
      [straightHigh],
      pickByRanks(sorted, order, Object.fromEntries(order.map((r) => [r, 1]))),
    )
  }

  if (groups[0]!.count === 3) {
    const trips = groups[0]!.rank
    const rest = groups.slice(1).map((g) => g.rank)
    return makeHand(
      'three-of-a-kind',
      [trips, ...rest],
      pickByRanks(sorted, [trips, ...rest], { [trips]: 3, [rest[0]!]: 1, [rest[1]!]: 1 }),
    )
  }

  if (groups[0]!.count === 2 && groups[1]!.count === 2) {
    const highPair = groups[0]!.rank
    const lowPair = groups[1]!.rank
    const kicker = groups[2]!.rank
    return makeHand(
      'two-pair',
      [highPair, lowPair, kicker],
      pickByRanks(sorted, [highPair, lowPair, kicker], {
        [highPair]: 2,
        [lowPair]: 2,
        [kicker]: 1,
      }),
    )
  }

  if (groups[0]!.count === 2) {
    const pair = groups[0]!.rank
    const rest = groups.slice(1).map((g) => g.rank)
    return makeHand(
      'pair',
      [pair, ...rest],
      pickByRanks(sorted, [pair, ...rest], {
        [pair]: 2,
        [rest[0]!]: 1,
        [rest[1]!]: 1,
        [rest[2]!]: 1,
      }),
    )
  }

  return makeHand('high-card', ranks, sorted)
}

function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = []
  const chosen: T[] = []
  const walk = (start: number) => {
    if (chosen.length === k) {
      result.push(chosen.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      chosen.push(items[i]!)
      walk(i + 1)
      chosen.pop()
    }
  }
  walk(0)
  return result
}

export function evaluateBest(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`evaluateBest needs at least 5 cards, got ${cards.length}`)
  }
  if (cards.length === 5) return evaluateFive(cards)

  let best: EvaluatedHand | null = null
  for (const combo of combinations(cards, 5)) {
    const evaluated = evaluateFive(combo)
    if (!best || evaluated.rankValue > best.rankValue) {
      best = evaluated
    }
  }
  return best!
}

export function evaluateHoldEm(hole: [Card, Card], board: Card[]): EvaluatedHand {
  return evaluateBest([...hole, ...board])
}
