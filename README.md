# Texas Hold’em

No-limit Texas Hold’em in the browser. Play heads-up or six-max against AI. The rules engine is UI-free and serializable so a multiplayer server can sit on top later.

## Play

```bash
cd texas-holdem
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

```bash
npm test      # hand ranking, pots, betting
npm run build # production bundle
```

## What’s in here

- **No-limit betting** with blinds, streets, min-raises, incomplete all-ins that do not reopen action, uncalled-bet returns, and side pots
- **Hand ranking** from high card through royal flush, including the wheel (`A-2-3-4-5`)
- **Heads-up blinds** — button is the small blind and acts first preflop
- **AI opponents** with tight / balanced / loose styles
- **Clean table UI** — felt, cards, pot, slider, keyboard shortcuts (`F` fold, `C`/`Space` check-call, `R` min raise, `A` all-in)

## Project shape

```
src/engine/      Pure state machine. No React. Safe to run on a server.
src/ai/          Chooses a PlayerAction from PublicView + LegalActions
src/session/     LocalSession wires engine + AI + timing
src/multiplayer/ Client/server message types for a future transport
src/ui/          React table
```

Every chip movement goes through `applyAction` / `continueHand` / `startHand`. The UI only reads `PublicView`. That is the multiplayer seam: a WebSocket host would apply the same actions and broadcast `PublicView` to each seat.

## Gameplay notes

- 2–6 players, default stack 1,000, blinds 10/20
- Community cards burn before flop / turn / river
- Side pots are paid in order; odd chip goes left of the button
- Rebuy is offered if you bust; the table ends if you take every stack
