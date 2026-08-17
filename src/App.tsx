import { useEffect, useState, useSyncExternalStore } from 'react'
import { LocalSession, type SessionConfig } from './session/local-session'
import { DeckPreview } from './ui/DeckPreview'
import { SetupScreen } from './ui/SetupScreen'
import { TableView } from './ui/TableView'

export default function App() {
  const [session, setSession] = useState<LocalSession | null>(null)
  const [previewDeck, setPreviewDeck] = useState(false)

  useEffect(() => {
    return () => session?.dispose()
  }, [session])

  const start = (config: SessionConfig) => {
    session?.dispose()
    setPreviewDeck(false)
    setSession(new LocalSession(config))
  }

  const leave = () => {
    session?.dispose()
    setSession(null)
  }

  if (previewDeck) {
    return <DeckPreview onBack={() => setPreviewDeck(false)} />
  }

  if (!session) {
    return <SetupScreen onStart={start} onPreviewDeck={() => setPreviewDeck(true)} />
  }

  return <LiveTable session={session} onLeave={leave} />
}

function LiveTable({ session, onLeave }: { session: LocalSession; onLeave: () => void }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  return <TableView session={session} snapshot={snapshot} onLeave={onLeave} />
}
