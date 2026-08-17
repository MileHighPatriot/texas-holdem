import type { Award, EvaluatedHand, GameState, Pot, Seat, WinnerInfo } from './types'
import { evaluateHoldEm } from './hand'

export function cloneState<T>(value: T): T {
  return structuredClone(value)
}

export function liveSeats(state: GameState): Seat[] {
  return state.seats.filter((s) => s.status === 'active' || s.status === 'all-in')
}

export function seatedPlayers(state: GameState): Seat[] {
  return state.seats.filter((s) => s.status !== 'empty')
}

export function playersWithChips(state: GameState): Seat[] {
  return state.seats.filter((s) => s.status !== 'empty' && s.status !== 'sitting-out' && s.chips > 0)
}

export function walkFrom(state: GameState, from: number, pred: (seat: Seat) => boolean): number[] {
  const n = state.seats.length
  const found: number[] = []
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    const seat = state.seats[idx]!
    if (pred(seat)) found.push(idx)
  }
  return found
}

export function nextMatching(state: GameState, from: number, pred: (seat: Seat) => boolean): number | null {
  const found = walkFrom(state, from, pred)
  return found[0] ?? null
}

export function potMiddle(state: GameState): number {
  return state.seats.reduce((sum, s) => sum + (s.handCommitted - s.streetCommitted), 0)
}

export function potTotal(state: GameState): number {
  return state.seats.reduce((sum, s) => sum + s.handCommitted, 0)
}

/**
 * Build main + side pots from hand commitments.
 * Folded players contribute but cannot win.
 */
export function buildPots(seats: Seat[]): Pot[] {
  const remaining = seats.map((s) => ({
    index: s.index,
    rem: s.handCommitted,
    folded: s.status === 'folded',
    empty: s.status === 'empty' || s.status === 'sitting-out',
  }))

  const pots: Pot[] = []
  let potIndex = 0

  while (remaining.some((p) => p.rem > 0)) {
    const contributing = remaining.filter((p) => p.rem > 0)
    const level = Math.min(...contributing.map((p) => p.rem))
    const amount = level * contributing.length
    for (const p of contributing) p.rem -= level
    const eligible = contributing.filter((p) => !p.folded && !p.empty).map((p) => p.index)
    pots.push({
      amount,
      eligible,
      label: potIndex === 0 ? 'Main pot' : `Side pot ${potIndex}`,
    })
    potIndex += 1
  }

  return pots.filter((p) => p.amount > 0)
}

export function returnUncalledBet(state: GameState): { state: GameState; returned: { seat: number; amount: number } | null } {
  const next = cloneState(state)
  const live = liveSeats(next)
  if (live.length !== 1) return { state: next, returned: null }

  const winner = live[0]!
  const othersMax = Math.max(0, ...next.seats.filter((s) => s.index !== winner.index).map((s) => s.handCommitted))
  if (winner.handCommitted <= othersMax) return { state: next, returned: null }

  const refund = winner.handCommitted - othersMax
  winner.chips += refund
  winner.handCommitted -= refund
  winner.streetCommitted = Math.max(0, winner.streetCommitted - refund)
  return { state: next, returned: { seat: winner.index, amount: refund } }
}

function oddChipFirst(state: GameState, winners: number[]): number {
  const from = state.button
  const order = walkFrom(state, from, (s) => winners.includes(s.index))
  return order[0] ?? winners[0]!
}

export function awardPots(state: GameState, foldedWin: boolean): { state: GameState; awards: Award[]; winners: WinnerInfo[] } {
  const next = cloneState(state)
  const pots = buildPots(next.seats)
  next.pots = pots
  const awards: Award[] = []

  for (let potIndex = 0; potIndex < pots.length; potIndex++) {
    const pot = pots[potIndex]!
    if (pot.amount <= 0 || pot.eligible.length === 0) continue

    let scores: Array<{ seat: number; hand: EvaluatedHand | null }> = []

    if (foldedWin) {
      scores = pot.eligible.map((seat) => ({ seat, hand: null }))
    } else {
      scores = pot.eligible.map((seatIndex) => {
        const seat = next.seats[seatIndex]!
        const hole = seat.hole
        if (!hole) return { seat: seatIndex, hand: null }
        return { seat: seatIndex, hand: evaluateHoldEm(hole, next.board) }
      })
    }

    const usable = scores.filter((s) => foldedWin || s.hand)
    if (usable.length === 0) continue

    const bestValue = foldedWin ? 0 : Math.max(...usable.map((s) => s.hand!.rankValue))
    const winningSeats = usable.filter((s) => foldedWin || s.hand!.rankValue === bestValue).map((s) => s.seat)

    const share = Math.floor(pot.amount / winningSeats.length)
    let remainder = pot.amount - share * winningSeats.length
    const oddFirst = oddChipFirst(next, winningSeats)

    for (const seatIndex of winningSeats) {
      let amount = share
      if (remainder > 0 && seatIndex === oddFirst) {
        amount += remainder
        remainder = 0
      }
      next.seats[seatIndex]!.chips += amount
      const scored = scores.find((s) => s.seat === seatIndex)
      awards.push({
        seat: seatIndex,
        amount,
        potIndex,
        potLabel: pot.label,
        hand: scored?.hand ?? null,
        foldedWin,
      })
    }
  }

  const bySeat = new Map<number, WinnerInfo>()
  for (const award of awards) {
    const existing = bySeat.get(award.seat)
    if (existing) {
      existing.amount += award.amount
      if (!existing.hand && award.hand) existing.hand = award.hand
    } else {
      bySeat.set(award.seat, {
        seat: award.seat,
        amount: award.amount,
        hand: award.hand,
        foldedWin,
      })
    }
  }

  const winners = [...bySeat.values()].sort((a, b) => b.amount - a.amount)
  next.awards = awards
  next.winners = winners

  for (const seat of next.seats) {
    seat.handCommitted = 0
    seat.streetCommitted = 0
  }

  return { state: next, awards, winners }
}

export function revealShowdown(state: GameState): GameState {
  const next = cloneState(state)
  for (const seat of next.seats) {
    if (seat.status === 'active' || seat.status === 'all-in') {
      seat.revealed = true
    }
  }
  return next
}
