import { describe, expect, it } from 'vitest'
import { parseCards } from './cards'
import { compareHands, evaluateBest, evaluateFive } from './hand'

function ev(text: string) {
  return evaluateBest(parseCards(text))
}

function five(text: string) {
  return evaluateFive(parseCards(text))
}

describe('evaluateFive categories', () => {
  it('ranks a royal flush above a king-high straight flush', () => {
    const royal = five('As Ks Qs Js Ts')
    const sf = five('Ks Qs Js Ts 9s')
    expect(royal.category).toBe('royal-flush')
    expect(royal.name).toBe('Royal Flush')
    expect(sf.category).toBe('straight-flush')
    expect(compareHands(royal, sf)).toBeGreaterThan(0)
  })

  it('detects a wheel straight flush', () => {
    const wheel = five('Ah 2h 3h 4h 5h')
    expect(wheel.category).toBe('straight-flush')
    expect(wheel.ranks[0]).toBe(5)
    expect(wheel.name).toBe('Straight Flush, Five high')
  })

  it('ranks quads with kicker', () => {
    const acesKing = five('As Ah Ad Ac Kd')
    const acesQueen = five('As Ah Ad Ac Qd')
    const kingsAce = five('Ks Kh Kd Kc Ad')
    expect(acesKing.category).toBe('four-of-a-kind')
    expect(acesKing.name).toBe('Four of a Kind, Aces')
    expect(compareHands(acesKing, acesQueen)).toBeGreaterThan(0)
    expect(compareHands(acesKing, kingsAce)).toBeGreaterThan(0)
  })

  it('ranks full houses by trips then pair', () => {
    const acesFullKings = five('As Ah Ad Kc Kd')
    const acesFullQueens = five('As Ah Ad Qc Qd')
    const kingsFullAces = five('Ks Kh Kd Ac Ad')
    expect(acesFullKings.category).toBe('full-house')
    expect(acesFullKings.name).toBe('Full House, Aces full of Kings')
    expect(compareHands(acesFullKings, acesFullQueens)).toBeGreaterThan(0)
    expect(compareHands(acesFullKings, kingsFullAces)).toBeGreaterThan(0)
  })

  it('ranks flushes by kickers', () => {
    const aceHigh = five('As 9s 7s 4s 2s')
    const kingHigh = five('Ks Qs 7s 4s 2s')
    const aceLower = five('Ah 9h 6h 4h 2h')
    expect(aceHigh.category).toBe('flush')
    expect(compareHands(aceHigh, kingHigh)).toBeGreaterThan(0)
    expect(compareHands(aceHigh, aceLower)).toBeGreaterThan(0)
  })

  it('detects broadway and wheel straights', () => {
    const broadway = five('As Kd Qh Jc Ts')
    const wheel = five('Ah 2c 3d 4s 5h')
    const sixHigh = five('2c 3d 4s 5h 6c')
    expect(broadway.category).toBe('straight')
    expect(broadway.ranks[0]).toBe(14)
    expect(wheel.category).toBe('straight')
    expect(wheel.ranks[0]).toBe(5)
    expect(wheel.name).toBe('Straight, Five high')
    expect(compareHands(sixHigh, wheel)).toBeGreaterThan(0)
    expect(compareHands(broadway, sixHigh)).toBeGreaterThan(0)
  })

  it('does not treat A-2-3-4-6 as a straight', () => {
    const hand = five('Ah 2c 3d 4s 6h')
    expect(hand.category).toBe('high-card')
  })

  it('ranks trips, two pair, pair, and high card with kickers', () => {
    const trips = five('Js Jh Jd 9c 2s')
    const twoPair = five('As Ah 8c 8d Kd')
    const pair = five('Ts Th Ad 7c 3s')
    const high = five('Ad Qc 9h 5c 2s')
    expect(trips.category).toBe('three-of-a-kind')
    expect(trips.name).toBe('Three of a Kind, Jacks')
    expect(twoPair.category).toBe('two-pair')
    expect(twoPair.name).toBe('Two Pair, Aces and Eights')
    expect(pair.category).toBe('pair')
    expect(pair.name).toBe('Pair of Tens')
    expect(high.category).toBe('high-card')
    expect(high.name).toBe('Ace high')
    expect(compareHands(trips, twoPair)).toBeGreaterThan(0)
    expect(compareHands(twoPair, pair)).toBeGreaterThan(0)
    expect(compareHands(pair, high)).toBeGreaterThan(0)
  })

  it('uses kickers for pairs and two pair', () => {
    const pairAceKicker = five('9s 9h Ad 7c 3s')
    const pairKingKicker = five('9s 9h Kd 7c 3s')
    const acesEightsKing = five('As Ah 8c 8d Kd')
    const acesEightsQueen = five('As Ah 8c 8d Qd')
    const acesSevens = five('As Ah 7c 7d Kd')
    expect(compareHands(pairAceKicker, pairKingKicker)).toBeGreaterThan(0)
    expect(compareHands(acesEightsKing, acesEightsQueen)).toBeGreaterThan(0)
    expect(compareHands(acesEightsKing, acesSevens)).toBeGreaterThan(0)
  })
})

describe('evaluateBest 7-card hold’em', () => {
  it('picks a royal from seven cards', () => {
    const hand = ev('As Ks Qs Js Ts 2d 3c')
    expect(hand.category).toBe('royal-flush')
  })

  it('prefers a flush over a straight', () => {
    const hand = ev('Ah Kh 9h 5h 2h 4c 3d')
    expect(hand.category).toBe('flush')
  })

  it('prefers a full house over a flush', () => {
    const hand = ev('Ah Ad As Kh Kd 9h 5h')
    expect(hand.category).toBe('full-house')
  })

  it('uses two trips as a full house', () => {
    const hand = ev('Ah Ad As Kh Kd Kc 2s')
    expect(hand.category).toBe('full-house')
    expect(hand.ranks[0]).toBe(14)
    expect(hand.ranks[1]).toBe(13)
  })

  it('uses the two highest pairs from three pair', () => {
    const hand = ev('Ah Ad Kh Kd 9c 9s 2d')
    expect(hand.category).toBe('two-pair')
    expect(hand.ranks[0]).toBe(14)
    expect(hand.ranks[1]).toBe(13)
    expect(hand.ranks[2]).toBe(9)
  })

  it('plays the board when the board is nuts', () => {
    const a = ev('2c 3d As Ks Qs Js Ts')
    const b = ev('4h 5h As Ks Qs Js Ts')
    expect(a.category).toBe('royal-flush')
    expect(compareHands(a, b)).toBe(0)
  })

  it('chops identical two-pair on board with same kicker', () => {
    const a = ev('2c 3d Ah Kd 9s 9c 4h')
    const b = ev('2s 3s Ah Kd 9s 9c 4h')
    expect(compareHands(a, b)).toBe(0)
  })

  it('awards the better kicker when the board pairs', () => {
    const aceKicker = ev('Ac 7d Kh Kd 9s 4c 2h')
    const queenKicker = ev('Qc 7s Kh Kd 9s 4c 2h')
    expect(aceKicker.category).toBe('pair')
    expect(compareHands(aceKicker, queenKicker)).toBeGreaterThan(0)
  })

  it('makes a wheel using the ace as low', () => {
    const hand = ev('Ah 8c 5d 4s 3h 2c Kd')
    expect(hand.category).toBe('straight')
    expect(hand.ranks[0]).toBe(5)
  })
})
