import type { CSSProperties } from 'react'
import { pilesForAmount } from './chips'
import { formatChips } from './format'

interface ChipStackProps {
  amount: number
  size?: 'sm' | 'md'
  showAmount?: boolean
}

export function ChipStack({ amount, size = 'sm', showAmount = true }: ChipStackProps) {
  if (amount <= 0) return null
  const piles = pilesForAmount(amount)

  return (
    <div className={`chip-stack chip-stack-${size}`}>
      <div className="chip-piles" aria-hidden="true">
        {piles.map((pile, si) => (
          <div
            key={`${pile.name}-${si}`}
            className={`chip-column chip-${pile.name}`}
            style={{ '--chips': pile.count } as CSSProperties}
          >
            {Array.from({ length: pile.count }, (_, i) => (
              <span key={i} className="chip" style={{ '--i': i } as CSSProperties}>
                <span className="chip-side" />
                <span className="chip-face" />
              </span>
            ))}
          </div>
        ))}
      </div>
      {showAmount && <span className="chip-label">{formatChips(amount)}</span>}
    </div>
  )
}
