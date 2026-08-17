/**
 * Multiplayer seam.
 *
 * Single-player uses the same contract a future server would:
 *   - The engine is a pure function: (GameState, seat, PlayerAction) -> { state, events }
 *   - Clients never see another player's hole cards unless `revealed` is set
 *   - `PublicView` is the only structure the UI / AI need
 *
 * A networked table can replace `LocalSession` with a transport that:
 *   1. Sends `ClientMessage` on user action
 *   2. Applies `ServerMessage` snapshots / events into the same UI
 *
 * Do not put React or DOM types in the engine. Do not let the UI mutate GameState.
 */

import type { GameEvent, PlayerAction, PublicView } from '../engine/types'

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'leave' }
  | { type: 'action'; action: PlayerAction; handNumber: number }
  | { type: 'next-hand' }
  | { type: 'rebuy'; amount: number }
  | { type: 'sit-out'; sitOut: boolean }

export type ServerMessage =
  | { type: 'view'; view: PublicView }
  | { type: 'event'; event: GameEvent }
  | { type: 'error'; message: string }
  | { type: 'table-closed'; reason: string }

export interface TableTransport {
  send(message: ClientMessage): void
  subscribe(handler: (message: ServerMessage) => void): () => void
}

/** Future WebSocket adapter would implement TableTransport and feed Local-style snapshots. */
export function notImplementedTransport(): TableTransport {
  return {
    send() {
      throw new Error('Network play is not wired yet. Use LocalSession.')
    },
    subscribe() {
      return () => undefined
    },
  }
}
