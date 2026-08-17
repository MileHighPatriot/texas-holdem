import { useEffect, useMemo, useState } from 'react'
import type { LegalActions, PublicView } from '../engine/types'
import { formatChips } from './format'

interface ActionBarProps {
  view: PublicView
  onAction: (type: 'fold' | 'check' | 'call' | 'raise-to' | 'all-in', amount?: number) => void
  onNextHand: () => void
  disabled: boolean
}

export function ActionBar({ view, onAction, onNextHand, disabled }: ActionBarProps) {
  const legal = view.legal
  const handOver = view.street === 'showdown' || view.street === 'hand-complete'
  const defaultRaise = useMemo(() => suggestedRaise(view, legal), [view, legal])
  const [raiseTo, setRaiseTo] = useState(defaultRaise)

  useEffect(() => {
    setRaiseTo(defaultRaise)
  }, [defaultRaise, view.handNumber, view.street, view.currentToAct])

  if (handOver) {
    return (
      <div className="action-bar">
        <p className="action-hint">Hand complete</p>
        <button className="btn btn-gold" onClick={onNextHand} type="button">
          Next hand
        </button>
      </div>
    )
  }

  if (!legal || !view.youToAct) {
    return (
      <div className="action-bar action-bar-wait">
        <p className="action-hint">Wait for your turn. F fold · C check/call · R raise · A all-in</p>
      </div>
    )
  }

  const min = legal.minRaiseTo
  const max = legal.maxRaiseTo
  const shortAllIn = (legal.canBet || legal.canRaise) && max < min
  const canSize = (legal.canBet || legal.canRaise) && max > min && !shortAllIn

  return (
    <div className="action-bar">
      <div className="raise-panel">
        {(legal.canBet || legal.canRaise) && (
          <>
            <div className="raise-presets">
              {legal.canBet && (
                <>
                  <button type="button" onClick={() => setRaiseTo(clamp(view.bigBlind * 3, min, max))}>
                    3x
                  </button>
                  <button type="button" onClick={() => setRaiseTo(clamp(Math.round(view.potTotal / 2), min, max))}>
                    ½ pot
                  </button>
                  <button type="button" onClick={() => setRaiseTo(clamp(view.potTotal, min, max))}>
                    Pot
                  </button>
                </>
              )}
              {legal.canRaise && (
                <>
                  <button type="button" onClick={() => setRaiseTo(min)}>
                    Min
                  </button>
                  <button type="button" onClick={() => setRaiseTo(clamp(Math.round(view.currentBet * 2.5), min, max))}>
                    2.5x
                  </button>
                  <button type="button" onClick={() => setRaiseTo(clamp(view.currentBet + view.potTotal, min, max))}>
                    Pot
                  </button>
                </>
              )}
              <button type="button" onClick={() => setRaiseTo(max)}>
                All-in
              </button>
            </div>
            {canSize && (
              <label className="raise-slider">
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={clamp(raiseTo, min, max)}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                />
                <span>{legal.canBet ? 'Bet' : 'Raise to'} {formatChips(clamp(raiseTo, min, max))}</span>
              </label>
            )}
          </>
        )}
      </div>

      <div className="action-buttons">
        <button className="btn btn-ghost" disabled={disabled || !legal.canFold} type="button" onClick={() => onAction('fold')}>
          Fold
        </button>
        {legal.canCheck ? (
          <button className="btn btn-plain" disabled={disabled} type="button" onClick={() => onAction('check')}>
            Check
          </button>
        ) : (
          <button
            className="btn btn-plain"
            disabled={disabled || !legal.canCall}
            type="button"
            onClick={() => onAction('call')}
          >
            Call {formatChips(legal.callAmount)}
          </button>
        )}
        {(legal.canBet || legal.canRaise) && !shortAllIn && (
          <button
            className="btn btn-gold"
            disabled={disabled}
            type="button"
            onClick={() => onAction('raise-to', clamp(raiseTo, min, max))}
          >
            {legal.canBet ? 'Bet' : 'Raise'} {formatChips(clamp(raiseTo, min, max))}
          </button>
        )}
        {legal.canAllIn && (!legal.canBet && !legal.canRaise || shortAllIn) && (
          <button className="btn btn-gold" disabled={disabled} type="button" onClick={() => onAction('all-in')}>
            All-in {formatChips(max)}
          </button>
        )}
      </div>
    </div>
  )
}

function suggestedRaise(view: PublicView, legal: LegalActions | null): number {
  if (!legal) return 0
  if (legal.canBet) {
    const open = view.board.length === 0 ? view.bigBlind * 3 : Math.max(view.bigBlind, Math.round(view.potTotal * 0.66))
    return clamp(open, legal.minRaiseTo, legal.maxRaiseTo)
  }
  if (legal.canRaise) {
    return clamp(Math.max(legal.minRaiseTo, Math.round(view.currentBet * 2.5)), legal.minRaiseTo, legal.maxRaiseTo)
  }
  return legal.maxRaiseTo
}

function clamp(n: number, min: number, max: number): number {
  if (min > max) return max
  return Math.max(min, Math.min(max, n))
}
