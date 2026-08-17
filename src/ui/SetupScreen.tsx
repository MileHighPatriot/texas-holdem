import { useState } from 'react'
import type { Difficulty } from '../ai/policy'
import type { SessionConfig } from '../session/local-session'

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void
  onPreviewDeck: () => void
}

export function SetupScreen({ onStart, onPreviewDeck }: SetupScreenProps) {
  const [playerName, setPlayerName] = useState('You')
  const [opponents, setOpponents] = useState(3)
  const [startingStack, setStartingStack] = useState(1000)
  const [blindSet, setBlindSet] = useState('10/20')
  const [difficulty, setDifficulty] = useState<Difficulty>('balanced')

  const [smallBlind, bigBlind] = blindSet.split('/').map(Number) as [number, number]

  return (
    <div className="setup">
      <div className="setup-hero">
        <p className="eyebrow">No-Limit · Six-max ready</p>
        <h1>Texas Hold’em</h1>
        <p className="lede">
          Heads-up or a full ring. Accurate ranking, real betting streets, and an AI that will take your chips if you
          give them away.
        </p>
      </div>

      <form
        className="setup-card"
        onSubmit={(e) => {
          e.preventDefault()
          onStart({
            playerName,
            opponents,
            startingStack,
            smallBlind,
            bigBlind,
            difficulty,
          })
        }}
      >
        <label>
          Your name
          <input value={playerName} maxLength={18} onChange={(e) => setPlayerName(e.target.value)} />
        </label>

        <label>
          Opponents
          <div className="choice-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={opponents === n ? 'is-on' : ''} onClick={() => setOpponents(n)}>
                {n}
              </button>
            ))}
          </div>
        </label>

        <label>
          Starting stack
          <div className="choice-row">
            {[500, 1000, 2000, 5000].map((n) => (
              <button
                key={n}
                type="button"
                className={startingStack === n ? 'is-on' : ''}
                onClick={() => setStartingStack(n)}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </label>

        <label>
          Blinds
          <div className="choice-row">
            {['5/10', '10/20', '25/50', '50/100'].map((n) => (
              <button key={n} type="button" className={blindSet === n ? 'is-on' : ''} onClick={() => setBlindSet(n)}>
                {n}
              </button>
            ))}
          </div>
        </label>

        <label>
          AI style
          <div className="choice-row">
            {(
              [
                ['tight', 'Tight'],
                ['balanced', 'Balanced'],
                ['loose', 'Loose'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={difficulty === id ? 'is-on' : ''} onClick={() => setDifficulty(id)}>
                {label}
              </button>
            ))}
          </div>
        </label>

        <button className="btn btn-gold btn-xl" type="submit">
          Deal me in
        </button>
        <button className="btn btn-ghost" type="button" onClick={onPreviewDeck}>
          Review the deck
        </button>
      </form>
    </div>
  )
}
