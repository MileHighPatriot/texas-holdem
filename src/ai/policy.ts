import { evaluateBest } from '../engine/hand'
import type { Card, LegalActions, PlayerAction, PublicView } from '../engine/types'

export interface Personality {
  id: string
  tightness: number
  aggression: number
  bluffFreq: number
}

export function personalityFor(id: string, difficulty: Difficulty, jitter: number): Personality {
  const base =
    difficulty === 'tight'
      ? { tightness: 0.76, aggression: 0.52, bluffFreq: 0.08 }
      : difficulty === 'loose'
        ? { tightness: 0.28, aggression: 0.72, bluffFreq: 0.3 }
        : { tightness: 0.5, aggression: 0.58, bluffFreq: 0.16 }

  return {
    id,
    tightness: clamp01(base.tightness + jitter * 0.12),
    aggression: clamp01(base.aggression + jitter * 0.1),
    bluffFreq: clamp01(base.bluffFreq + jitter * 0.06),
  }
}

export type Difficulty = 'tight' | 'balanced' | 'loose'

export const AI_ROSTER = [
  'Dallas',
  'Rio',
  'Harper',
  'Marlowe',
  'Boone',
  'Sable',
  'Vesper',
  'Nash',
] as const

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function rand(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function holeStrength(a: Card, b: Card): number {
  const high = Math.max(a.rank, b.rank)
  const low = Math.min(a.rank, b.rank)
  const pair = a.rank === b.rank
  const suited = a.suit === b.suit
  const gap = high - low

  if (pair) return clamp01(0.52 + (high - 2) * 0.038)

  let score = ((high - 2) / 12) * 0.55 + ((low - 2) / 12) * 0.18
  if (suited) score += 0.09
  if (gap === 1) score += 0.07
  else if (gap === 2) score += 0.035
  else score -= Math.min(0.2, (gap - 2) * 0.03)
  if (high === 14) score += 0.08
  if (high >= 13 && low >= 10) score += 0.04
  return clamp01(score)
}

function positionFactor(view: PublicView, seatIndex: number): number {
  const live = view.seats.filter((s) => s.status === 'active' || s.status === 'all-in')
  if (live.length <= 2) return 0.7
  const order: number[] = []
  let idx = view.button
  for (let n = 0; n < view.seats.length; n++) {
    idx = (idx + 1) % view.seats.length
    const seat = view.seats[idx]
    if (seat && (seat.status === 'active' || seat.status === 'all-in')) order.push(idx)
  }
  const pos = order.indexOf(seatIndex)
  if (pos < 0) return 0.4
  return order.length <= 1 ? 0.5 : pos / (order.length - 1)
}

function drawStrength(hole: [Card, Card], board: Card[]): number {
  if (board.length < 3) return 0
  const cards = [...hole, ...board]
  const bySuit = new Map<string, number>()
  for (const card of cards) bySuit.set(card.suit, (bySuit.get(card.suit) ?? 0) + 1)
  const flushDraw = [...bySuit.values()].some((n) => n === 4)

  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b)
  const expanded = ranks.includes(14) ? [1, ...ranks] : ranks
  let oesd = false
  let gutshot = false
  for (let i = 0; i < expanded.length; i++) {
    for (let j = i; j < expanded.length; j++) {
      const window = expanded.slice(i, j + 1)
      const span = window[window.length - 1]! - window[0]!
      if (window.length === 4 && span === 3) oesd = true
      if (window.length === 4 && span === 4) gutshot = true
    }
  }

  let score = 0
  if (flushDraw) score += 0.22
  if (oesd) score += 0.16
  else if (gutshot) score += 0.07
  const overs = hole.filter((c) => board.every((b) => c.rank > b.rank)).length
  score += overs * 0.04
  return score
}

function boardPairCount(board: Card[]): number {
  const counts = new Map<number, number>()
  for (const card of board) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  return [...counts.values()].filter((n) => n >= 2).length
}

function madeScore(hole: [Card, Card], board: Card[]): number {
  if (board.length < 3) return holeStrength(hole[0], hole[1])
  const hand = evaluateBest([...hole, ...board])
  let score = 0.12 + hand.categoryRank * 0.09
  if (hand.category === 'pair') {
    const pairRank = hand.ranks[0]!
    const boardPairs = board.filter((c) => c.rank === pairRank).length >= 2
    const top = Math.max(...board.map((c) => c.rank))
    if (boardPairs) score = 0.18
    else if (pairRank === top) score = 0.48 + (hand.ranks[1] ?? 0) * 0.01
    else if (pairRank > top) score = 0.56
    else score = 0.28
  }
  if (hand.category === 'two-pair' && boardPairCount(board) >= 2) score = 0.3
  if (hand.categoryRank >= 3) score = Math.max(score, 0.62 + hand.categoryRank * 0.05)
  if (hand.categoryRank >= 6) score = 0.94
  return clamp01(score)
}

function raiseTo(legal: LegalActions, desired: number): PlayerAction {
  if (legal.minRaiseTo > legal.maxRaiseTo) {
    if (legal.canAllIn) return { type: 'all-in' }
    return fallback(legal)
  }
  const capped = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(desired)))
  if (capped >= legal.maxRaiseTo) return { type: 'all-in' }
  if (legal.canBet || legal.canRaise) return { type: 'raise-to', amount: capped }
  if (legal.canAllIn && desired >= legal.maxRaiseTo) return { type: 'all-in' }
  if (legal.canCall) return { type: 'call' }
  if (legal.canCheck) return { type: 'check' }
  return { type: 'fold' }
}

function fallback(legal: LegalActions): PlayerAction {
  if (legal.canCheck) return { type: 'check' }
  if (legal.canCall) return { type: 'call' }
  if (legal.canAllIn) return { type: 'all-in' }
  return { type: 'fold' }
}

export function chooseAction(
  view: PublicView,
  legal: LegalActions,
  personality: Personality,
  rng: () => number = Math.random,
): PlayerAction {
  const seat = view.seats.find((s) => s.index === view.heroSeat)
  const hole = view.heroHole
  if (!seat || !hole) return fallback(legal)

  const pos = positionFactor(view, seat.index)
  const preflop = view.board.length === 0
  const strength = preflop
    ? holeStrength(hole[0], hole[1]) + pos * 0.08 - personality.tightness * 0.12
    : madeScore(hole, view.board) + drawStrength(hole, view.board) * (0.7 + personality.aggression * 0.4)

  const toCall = legal.callAmount
  const potOdds = toCall <= 0 ? 0 : toCall / (view.potTotal + toCall)
  const threshold = 0.28 + personality.tightness * 0.22 - pos * 0.1
  const strong = strength > 0.62
  const monster = strength > 0.82
  const playable = strength >= threshold
  const bluff = rng() < personality.bluffFreq * (0.4 + pos)

  if (legal.canCheck && !legal.facingBet) {
    if (monster || (strong && rng() < personality.aggression)) {
      const size = view.potTotal * rand(rng, 0.55, 0.85)
      return raiseTo(legal, seat.streetCommitted + Math.max(view.bigBlind, size))
    }
    if (bluff && pos > 0.55 && (legal.canBet || legal.canRaise)) {
      const size = view.potTotal * rand(rng, 0.4, 0.66)
      return raiseTo(legal, seat.streetCommitted + Math.max(view.bigBlind, size))
    }
    return { type: 'check' }
  }

  if (legal.facingBet) {
    if (monster && (legal.canRaise || legal.canAllIn) && rng() < 0.35 + personality.aggression * 0.5) {
      return raiseTo(legal, view.currentBet + Math.max(legal.minRaiseTo - view.currentBet, view.potTotal * 0.7))
    }
    if (strong || (playable && potOdds < strength * 0.9)) {
      if (legal.canRaise && strength > 0.7 && rng() < personality.aggression * 0.45) {
        return raiseTo(legal, view.currentBet * 2.2)
      }
      if (legal.canCall) return { type: 'call' }
    }
    if (legal.canCall && potOdds < 0.22 && strength > threshold - 0.08) return { type: 'call' }
    if (bluff && legal.canRaise && pos > 0.6 && toCall < view.potTotal * 0.4) {
      return raiseTo(legal, view.currentBet + view.potTotal * 0.75)
    }
    if (legal.canCheck) return { type: 'check' }
    return { type: 'fold' }
  }

  return fallback(legal)
}
