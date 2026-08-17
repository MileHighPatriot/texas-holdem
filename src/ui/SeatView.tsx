import type { CSSProperties } from 'react'
import type { PublicSeat } from '../engine/types'
import { CardView } from './CardView'
import { ChipStack } from './ChipStack'
import { formatChips, initials, seatAccent } from './format'

interface SeatViewProps {
  seat: PublicSeat
  style: CSSProperties
  thinking: boolean
  winner: boolean
  winnerAmount?: number
  isHero: boolean
}

export function SeatView({ seat, style, thinking, winner, winnerAmount, isHero }: SeatViewProps) {
  if (seat.status === 'empty') return null

  const folded = seat.status === 'folded'
  const sittingOut = seat.status === 'sitting-out'
  const showCards = Boolean(seat.hole) || (!folded && !sittingOut)

  return (
    <div
      className={[
        'seat',
        isHero ? 'seat-hero' : '',
        folded ? 'seat-folded' : '',
        seat.toAct ? 'seat-turn' : '',
        thinking ? 'seat-thinking' : '',
        winner ? 'seat-winner' : '',
        sittingOut ? 'seat-out' : '',
      ].join(' ')}
      style={style}
    >
      {seat.streetCommitted > 0 && <ChipStack amount={seat.streetCommitted} size="sm" />}

      <div className="seat-cards">
        {showCards && seat.status !== 'sitting-out' && (
          <>
            <div className="hole hole-left">
              <CardView card={seat.hole?.[0]} hidden={!seat.hole} size={isHero ? 'lg' : 'md'} />
            </div>
            <div className="hole hole-right">
              <CardView card={seat.hole?.[1]} hidden={!seat.hole} size={isHero ? 'lg' : 'md'} delay={60} />
            </div>
          </>
        )}
      </div>

      <div className="seat-plaque">
        <div className="seat-avatar" style={{ background: seatAccent(seat.index) }}>
          {initials(seat.name)}
        </div>
        <div className="seat-meta">
          <div className="seat-name">
            {isHero ? 'You' : seat.name}
            {seat.isButton && <span className="btn-dealer">D</span>}
            {seat.isSB && <span className="btn-blind">SB</span>}
            {seat.isBB && <span className="btn-blind">BB</span>}
          </div>
          <div className="seat-stack">
            {sittingOut ? 'Busted' : seat.status === 'all-in' ? 'All-in' : formatChips(seat.chips)}
          </div>
        </div>
      </div>

      {winner && winnerAmount !== undefined && (
        <div className="seat-win-tag">+{formatChips(winnerAmount)}</div>
      )}
    </div>
  )
}
