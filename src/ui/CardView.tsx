import type { Card, Rank, Suit } from '../engine/types'
import { isRedSuit, rankGlyph } from './format'

interface CardViewProps {
  card?: Card | null
  hidden?: boolean
  placeholder?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  delay?: number
}

interface Pip {
  col: 1 | 2 | 3
  row: 1 | 2 | 3 | 4 | 5 | 6 | 7
  flip?: boolean
}

const PIPS: Partial<Record<Rank, Pip[]>> = {
  14: [{ col: 2, row: 4 }],
  2: [
    { col: 2, row: 1 },
    { col: 2, row: 7, flip: true },
  ],
  3: [
    { col: 2, row: 1 },
    { col: 2, row: 4 },
    { col: 2, row: 7, flip: true },
  ],
  4: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  5: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 2, row: 4 },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  6: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 1, row: 4 },
    { col: 3, row: 4 },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  7: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 2, row: 2 },
    { col: 1, row: 4 },
    { col: 3, row: 4 },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  8: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 2, row: 2 },
    { col: 1, row: 4 },
    { col: 3, row: 4 },
    { col: 2, row: 6, flip: true },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  9: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 1, row: 3 },
    { col: 3, row: 3 },
    { col: 2, row: 4 },
    { col: 1, row: 5, flip: true },
    { col: 3, row: 5, flip: true },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
  10: [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 2, row: 2 },
    { col: 1, row: 3 },
    { col: 3, row: 3 },
    { col: 1, row: 5, flip: true },
    { col: 3, row: 5, flip: true },
    { col: 2, row: 6, flip: true },
    { col: 1, row: 7, flip: true },
    { col: 3, row: 7, flip: true },
  ],
}

const FACE_RANKS = new Set<Rank>([11, 12, 13])
const SUIT_LABEL: Record<Suit, string> = {
  s: 'spades',
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
}

const CARD_BOX = {
  sm: { width: 96, height: 134, fontSize: 22 },
  md: { width: 118, height: 165, fontSize: 26 },
  lg: { width: 136, height: 190, fontSize: 30 },
  xl: { width: 154, height: 216, fontSize: 34 },
} as const

export function CardView({ card, hidden = false, placeholder = false, size = 'md', delay = 0 }: CardViewProps) {
  const box = CARD_BOX[size]
  const cardStyle = {
    width: box.width,
    height: box.height,
    fontSize: box.fontSize,
    animationDelay: `${delay}ms`,
  }

  if (placeholder && !card && !hidden) {
    return <div className={`card card-${size} card-slot`} style={cardStyle} />
  }

  const face = !hidden && card
  const red = face ? isRedSuit(card) : false
  const ten = Boolean(face && card.rank === 10)

  return (
    <div
      className={`card card-${size} ${face ? 'card-face' : 'card-back'} ${red ? 'card-red' : 'card-black'} ${ten ? 'card-ten' : ''}`}
      style={cardStyle}
      aria-label={face ? `${rankGlyph(card)} of ${SUIT_LABEL[card.suit]}` : hidden ? 'Facedown card' : 'Empty card'}
    >
      {face ? <CardFace card={card} /> : <CardBack />}
    </div>
  )
}

function CardFace({ card }: { card: Card }) {
  const rank = rankGlyph(card)
  const pips = PIPS[card.rank]
  const royal = FACE_RANKS.has(card.rank)
  const ace = card.rank === 14

  return (
    <>
      <div className="card-plate" />
      <div className="card-corner">
        <span className="card-rank">{rank}</span>
        <SuitMark suit={card.suit} className="card-suit" />
      </div>
      {royal ? (
        <div className="card-royal">
          <span className="card-flourish" aria-hidden="true">
            ❦
          </span>
          <span className="card-royal-rank">{rank}</span>
          <SuitMark suit={card.suit} className="card-royal-suit" />
          <span className="card-flourish card-flourish-flip" aria-hidden="true">
            ❦
          </span>
        </div>
      ) : ace ? (
        <div className="card-ace">
          <span className="card-ace-ring">
            <SuitMark suit={card.suit} className="pip-ace" />
          </span>
        </div>
      ) : pips ? (
        <div className="card-pips">
          {pips.map((pip, i) => (
            <span
              key={i}
              className={`pip ${pip.flip ? 'pip-flip' : ''}`}
              style={{ gridColumn: pip.col, gridRow: pip.row }}
            >
              <SuitMark suit={card.suit} />
            </span>
          ))}
        </div>
      ) : null}
      <div className="card-corner card-corner-br">
        <span className="card-rank">{rank}</span>
        <SuitMark suit={card.suit} className="card-suit" />
      </div>
    </>
  )
}

function CardBack() {
  return (
    <div className="card-back-pattern">
      <div className="card-back-field">
        <div className="card-back-seal">
          <SuitMark suit="s" />
        </div>
      </div>
    </div>
  )
}

function SuitMark({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg className={className ? `suit-mark ${className}` : 'suit-mark'} viewBox="0 0 24 24" aria-hidden="true">
      {suit === 'h' && (
        <path d="M12 21.2S2.8 14.6 2.8 8.9A5.35 5.35 0 0 1 8.4 3.4c1.7 0 3.2.9 3.6 2.3.4-1.4 1.9-2.3 3.6-2.3a5.35 5.35 0 0 1 5.6 5.5c0 5.7-9.2 12.3-9.2 12.3z" />
      )}
      {suit === 'd' && <path d="M12 2.4 21.4 12 12 21.6 2.6 12z" />}
      {suit === 's' && (
        <path d="M12 2.2C12 2.2 3.2 11.4 3.2 16.1c0 3.1 2.4 5.3 5.4 5.3 1.1 0 2.1-.4 2.9-1.1v-2.4c-1.1 2-2.7 3.5-4.1 4.1h9.2c-1.4-.6-3-2.1-4.1-4.1v2.4c.8.7 1.8 1.1 2.9 1.1 3 0 5.4-2.2 5.4-5.3C20.8 11.4 12 2.2 12 2.2z" />
      )}
      {suit === 'c' && (
        <>
          <circle cx="12" cy="6.3" r="4.05" />
          <circle cx="7.15" cy="12.55" r="4.05" />
          <circle cx="16.85" cy="12.55" r="4.05" />
          <path d="M10.7 13.2 9.5 22h5l-1.2-8.8z" />
        </>
      )}
    </svg>
  )
}
