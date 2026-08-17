import { useEffect, useRef } from 'react'
import type { LogEntry } from '../session/local-session'

export function HandLog({ entries, open }: { entries: LogEntry[]; open: boolean }) {
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [entries, open])

  return (
    <aside className={`hand-log ${open ? 'is-open' : ''}`}>
      <header>Hand log</header>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id} className={`log-${entry.tone}`}>
            {entry.text}
          </li>
        ))}
        <div ref={endRef} />
      </ol>
    </aside>
  )
}
