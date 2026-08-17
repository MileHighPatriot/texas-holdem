# Texas Hold’em — Cursor handoff

Vite + React 19 + TypeScript. Single-player vs AI. Engine is UI-free so multiplayer can plug in later.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## Layout

- `src/engine/` — pure state machine. No React. `applyAction` / `continueHand` / `startHand` are the only mutators.
- `src/ai/policy.ts` — picks a `PlayerAction` from `PublicView` + `LegalActions`.
- `src/session/local-session.ts` — wires engine + AI + timing for local play.
- `src/multiplayer/protocol.ts` — client/server message types; not wired yet.
- `src/ui/` — table, cards, setup. Card faces live in `CardView.tsx`. Tens display as **10**, never `T`.

## Rules already implemented

No-limit Hold’em: blinds, streets, min-raise, incomplete all-in does not reopen, uncalled-bet return, side pots, heads-up blinds (button is SB and acts first preflop), wheel straight `A-2-3-4-5`.

UI and AI must only read `PublicView`. Do not let React mutate `GameState`.

## Tests

`src/engine/*.test.ts` covers ranking, pots, betting, and 30-hand AI playouts (chip total stays 4000). Keep those green.

Internal parse codes still use `T` for ten (`Ts`, `Td`). That is engine notation only — never show `T` on a card face.
