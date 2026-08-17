import { RANKS, SUIT_GLYPHS, SUIT_NAMES, SUITS } from '../engine/cards'
import { CardView } from './CardView'

export function DeckPreview({ onBack }: { onBack: () => void }) {
  return (
    <div className="deck-preview">
      <header className="deck-preview-head">
        <div>
          <p className="eyebrow">Standard 52-card deck</p>
          <h1>The cards</h1>
          <p className="lede">Tens read as 10. Number cards use pip layouts. Jack, Queen, and King are face cards.</p>
        </div>
        <button className="btn btn-gold" type="button" onClick={onBack}>
          Back to table
        </button>
      </header>

      {SUITS.map((suit) => (
        <section key={suit} className="deck-suit">
          <h2>
            <span className={suit === 'h' || suit === 'd' ? 'card-red' : 'suit-heading-black'}>{SUIT_GLYPHS[suit]}</span>
            {SUIT_NAMES[suit]}
          </h2>
          <div className="deck-row">
            {RANKS.map((rank) => (
              <CardView key={`${rank}${suit}`} card={{ rank, suit }} size="lg" />
            ))}
          </div>
        </section>
      ))}

      <section className="deck-suit">
        <h2>Card backs</h2>
        <div className="deck-row">
          <CardView hidden size="lg" />
          <CardView hidden size="md" />
          <CardView hidden size="sm" />
        </div>
      </section>
    </div>
  )
}
