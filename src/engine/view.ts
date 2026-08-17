import { legalActions } from './legal'
import { potMiddle, potTotal } from './pots'
import type { GameState, PublicSeat, PublicView } from './types'

export function publicView(state: GameState, viewerSeat: number | null): PublicView {
  const hero = viewerSeat !== null ? state.seats[viewerSeat] ?? null : null

  const seats: PublicSeat[] = state.seats.map((seat) => {
    const showHole =
      Boolean(seat.hole) &&
      (seat.revealed || (viewerSeat !== null && seat.index === viewerSeat))
    return {
      index: seat.index,
      id: seat.id,
      name: seat.name,
      isHuman: seat.isHuman,
      chips: seat.chips,
      hole: showHole ? seat.hole : null,
      status: seat.status,
      streetCommitted: seat.streetCommitted,
      handCommitted: seat.handCommitted,
      isButton: seat.index === state.button,
      isSB: seat.index === state.sbIndex,
      isBB: seat.index === state.bbIndex,
      toAct: state.currentToAct === seat.index,
    }
  })

  const youToAct = viewerSeat !== null && state.currentToAct === viewerSeat

  return {
    handNumber: state.handNumber,
    street: state.street,
    board: state.board.map((c) => ({ ...c })),
    potMiddle: potMiddle(state),
    potTotal: potTotal(state),
    pots: state.pots.map((p) => ({ ...p, eligible: [...p.eligible] })),
    currentBet: state.currentBet,
    button: state.button,
    sbIndex: state.sbIndex,
    bbIndex: state.bbIndex,
    currentToAct: state.currentToAct,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    heroSeat: viewerSeat,
    heroHole: hero?.hole ? [hero.hole[0], hero.hole[1]] : null,
    seats,
    legal: youToAct && viewerSeat !== null ? legalActions(state, viewerSeat) : null,
    awards: state.awards,
    winners: state.winners,
    youToAct,
  }
}
