import { useEffect, useMemo, useState } from 'react'
import type { PlayerAction } from '../engine/types'
import type { LocalSession, SessionSnapshot } from '../session/local-session'
import { formatChips } from '../session/local-session'
import { isSoundEnabled, playCheck, playChip, playDeal, playFold, playWin, setSoundEnabled } from './audio'
import { ActionBar } from './ActionBar'
import { CardView } from './CardView'
import { ChipStack } from './ChipStack'
import { HandLog } from './HandLog'
import { seatPosition, streetLabel } from './format'
import { SeatView } from './SeatView'

interface TableViewProps {
  session: LocalSession
  snapshot: SessionSnapshot
  onLeave: () => void
}

export function TableView({ session, snapshot, onLeave }: TableViewProps) {
  const { view, log, thinkingSeat, gameOver, gameOverReason } = snapshot
  const [logOpen, setLogOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const heroIndex = view.heroSeat ?? 0
  const seats = view.seats.filter((s) => s.status !== 'empty')

  const status = useMemo(() => statusLine(snapshot), [snapshot])
  const winnerBySeat = new Map(view.winners.map((w) => [w.seat, w.amount]))

  useEffect(() => {
    const last = log[log.length - 1]
    if (!last) return
    if (last.tone === 'street') playDeal()
    if (last.tone === 'win') playWin()
    if (last.text.includes('folds')) playFold()
    else if (last.text.includes('checks')) playCheck()
    else if (last.tone === 'action') playChip()
  }, [log])

  useEffect(() => {
    if (gameOver) return
    if (view.street !== 'showdown' && view.street !== 'hand-complete') return
    const timer = window.setTimeout(() => session.nextHand(), 4200)
    return () => window.clearTimeout(timer)
  }, [gameOver, session, view.street, view.handNumber])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const legal = view.legal
      if ((view.street === 'showdown' || view.street === 'hand-complete') && (event.key === 'n' || event.key === 'N' || event.key === 'Enter')) {
        session.nextHand()
        return
      }
      if (!legal || !view.youToAct) return
      const key = event.key.toLowerCase()
      if (key === 'f') session.act({ type: 'fold' })
      if (key === 'c' || key === ' ') {
        event.preventDefault()
        if (legal.canCheck) session.act({ type: 'check' })
        else if (legal.canCall) session.act({ type: 'call' })
      }
      if (key === 'r' && (legal.canBet || legal.canRaise)) {
        session.act({ type: 'raise-to', amount: legal.minRaiseTo })
      }
      if (key === 'a' && legal.canAllIn) session.act({ type: 'all-in' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, view.legal, view.street, view.youToAct])

  const onAction = (type: 'fold' | 'check' | 'call' | 'raise-to' | 'all-in', amount?: number) => {
    const action: PlayerAction =
      type === 'raise-to' ? { type, amount: amount ?? 0 } : { type }
    session.act(action)
  }

  return (
    <div className="table-screen">
      <header className="topbar">
        <div>
          <p className="brand">Texas Hold’em</p>
          <p className="meta">
            Hand #{view.handNumber || '—'} · Blinds {formatChips(view.smallBlind)}/{formatChips(view.bigBlind)} ·{' '}
            {streetLabel(view.street)}
          </p>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-tiny"
            onClick={() => {
              const next = !soundOn
              setSoundOn(next)
              setSoundEnabled(next)
            }}
          >
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" className="btn btn-tiny" onClick={() => setLogOpen((v) => !v)}>
            Log
          </button>
          <button type="button" className="btn btn-tiny" onClick={onLeave}>
            Leave table
          </button>
        </div>
      </header>

      <div className="table-layout">
        <div className="felt-wrap">
          <div className="table-spotlight" aria-hidden="true" />
          <div className="table-floor-shadow" aria-hidden="true" />
          <div className="felt">
            <div className="table-thickness" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="felt-pad">
              <div className="felt-inner">
                <div className="felt-nap" aria-hidden="true" />
                <div className="betting-line" aria-hidden="true" />
                <div className="table-brand" aria-hidden="true">
                  <span>Texas Hold’em</span>
                </div>
                <div className="table-center">
                  <div className="pot-display">
                    {view.potMiddle > 0 && (
                      <ChipStack amount={view.potMiddle} size="md" showAmount={false} />
                    )}
                    <span className="pot-label">Pot</span>
                    <span className="pot-value">{formatChips(view.potTotal)}</span>
                    {view.potMiddle > 0 && view.potTotal !== view.potMiddle && (
                      <span className="pot-sub">In middle {formatChips(view.potMiddle)}</span>
                    )}
                  </div>
                  <div className="board">
                    {Array.from({ length: 5 }, (_, i) => (
                      <CardView key={i} card={view.board[i]} placeholder size="xl" delay={i * 70} />
                    ))}
                  </div>
                  <p className="table-status">{status}</p>
                </div>

                {seats.map((seat) => (
                  <SeatView
                    key={seat.id}
                    seat={seat}
                    isHero={seat.index === heroIndex}
                    thinking={thinkingSeat === seat.index && !seat.isHuman}
                    winner={winnerBySeat.has(seat.index)}
                    winnerAmount={winnerBySeat.get(seat.index)}
                    style={seatPosition(seat.index, heroIndex, seats.length)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <HandLog entries={log} open={logOpen} />
      </div>

      <ActionBar
        view={view}
        disabled={!view.youToAct}
        onAction={onAction}
        onNextHand={() => session.nextHand()}
      />

      {gameOver && (
        <div className="overlay">
          <div className="overlay-card">
            {gameOverReason === 'won' ? (
              <>
                <h2>You cleaned them out.</h2>
                <p>Every opponent is busted. The table is yours.</p>
              </>
            ) : (
              <>
                <h2>Busted.</h2>
                <p>Rebuy to the starting stack and stay in, or leave the table.</p>
              </>
            )}
            <div className="overlay-actions">
              {gameOverReason === 'busted' && (
                <button type="button" className="btn btn-gold" onClick={() => session.rebuyHero()}>
                  Rebuy {formatChips(snapshot.startingStack)}
                </button>
              )}
              <button type="button" className="btn btn-plain" onClick={onLeave}>
                New table
              </button>
              {gameOverReason === 'won' && (
                <button type="button" className="btn btn-gold" onClick={onLeave}>
                  Play again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLine(snapshot: SessionSnapshot): string {
  const { view, thinkingSeat } = snapshot
  if (view.street === 'showdown' || view.street === 'hand-complete') {
    if (view.winners.length === 0) return 'Hand complete'
    if (view.winners.length > 1 && view.winners.every((w) => w.amount === view.winners[0]!.amount)) {
      return `Split pot${view.winners[0]!.hand ? ` · ${view.winners[0]!.hand.name}` : ''}`
    }
    const top = view.winners[0]!
    const name = view.seats[top.seat]?.isHuman ? 'You' : view.seats[top.seat]?.name ?? 'Winner'
    if (top.foldedWin) return `${name} wins ${formatChips(top.amount)}`
    return `${name} wins${top.hand ? ` with ${top.hand.name}` : ''}`
  }
  if (view.youToAct) return 'Your move'
  if (thinkingSeat !== null) {
    const name = view.seats[thinkingSeat]?.name ?? 'Opponent'
    return `${name} is thinking…`
  }
  return streetLabel(view.street)
}
