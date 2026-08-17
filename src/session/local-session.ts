import { AI_ROSTER, chooseAction, personalityFor, type Difficulty, type Personality } from '../ai/policy'
import {
  applyAction,
  continueHand,
  createTable,
  fundedPlayers,
  needsContinue,
  publicView,
  rebuy,
  startHand,
} from '../engine'
import type { GameEvent, GameState, PlayerAction, PublicView, TableConfig } from '../engine/types'

export interface SessionConfig {
  playerName: string
  opponents: number
  startingStack: number
  smallBlind: number
  bigBlind: number
  difficulty: Difficulty
  seed?: number
}

export interface LogEntry {
  id: number
  text: string
  tone: 'info' | 'action' | 'street' | 'win'
}

export interface SessionSnapshot {
  view: PublicView
  log: LogEntry[]
  thinkingSeat: number | null
  startingStack: number
  difficulty: Difficulty
  gameOver: boolean
  gameOverReason: 'won' | 'busted' | null
}

export class LocalSession {
  private state: GameState
  private heroSeat = 0
  private personalities = new Map<number, Personality>()
  private listeners = new Set<() => void>()
  private snapshot: SessionSnapshot
  private log: LogEntry[] = []
  private logId = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private thinkingSeat: number | null = null
  private startingStack: number
  private difficulty: Difficulty
  private closed = false

  constructor(config: SessionConfig) {
    this.startingStack = config.startingStack
    this.difficulty = config.difficulty
    const tableConfig = buildTableConfig(config)
    this.state = createTable(tableConfig)
    this.heroSeat = 0
    for (const seat of this.state.seats) {
      if (!seat.isHuman) {
        const jitter = (hashCode(seat.id) % 21) / 100 - 0.1
        this.personalities.set(seat.index, personalityFor(seat.id, config.difficulty, jitter))
      }
    }
    this.snapshot = this.computeSnapshot()
    const started = startHand(this.state)
    this.state = started.state
    this.ingest(started.events)
    this.snapshot = this.computeSnapshot()
    this.queue()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SessionSnapshot => this.snapshot

  dispose(): void {
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  act(action: PlayerAction): void {
    if (this.state.currentToAct !== this.heroSeat) return
    const result = applyAction(this.state, this.heroSeat, action)
    if (result.error) {
      this.pushLog(result.error, 'info')
      this.emit()
      return
    }
    this.state = result.state
    this.ingest(result.events)
    this.emit()
    this.queue()
  }

  nextHand(): void {
    if (this.state.street !== 'showdown' && this.state.street !== 'hand-complete' && this.state.street !== 'idle') {
      return
    }
    const result = startHand(this.state)
    this.state = result.state
    this.ingest(result.events)
    this.emit()
    this.queue()
  }

  rebuyHero(): void {
    const hero = this.state.seats[this.heroSeat]
    if (!hero || hero.chips > 0) return
    const amount = this.startingStack
    const result = rebuy(this.state, this.heroSeat, amount)
    this.state = result.state
    this.pushLog(`You rebuy for ${formatChips(amount)}.`, 'info')
    if (this.state.street === 'idle' || this.state.street === 'hand-complete' || this.state.street === 'showdown') {
      const started = startHand(this.state)
      this.state = started.state
      this.ingest(started.events)
    }
    this.emit()
    this.queue()
  }

  private queue(): void {
    if (this.closed) return
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const delay = this.nextDelay()
    if (delay === null) {
      this.thinkingSeat = null
      this.emit()
      return
    }

    this.thinkingSeat = this.state.currentToAct
    this.emit()
    this.timer = setTimeout(() => {
      this.timer = null
      this.step()
    }, delay)
  }

  private nextDelay(): number | null {
    if (needsContinue(this.state)) {
      return this.state.board.length === 0 ? 520 : 720
    }
    const idx = this.state.currentToAct
    if (idx === null) return null
    const seat = this.state.seats[idx]
    if (!seat || seat.isHuman) return null
    return 420 + Math.floor(Math.random() * 700)
  }

  private step(): void {
    if (this.closed) return

    if (needsContinue(this.state)) {
      const result = continueHand(this.state)
      this.state = result.state
      this.ingest(result.events)
      this.emit()
      this.queue()
      return
    }

    const idx = this.state.currentToAct
    if (idx === null) return
    const seat = this.state.seats[idx]
    if (!seat || seat.isHuman) return

    const view = publicView(this.state, idx)
    if (!view.legal) return
    const personality = this.personalities.get(idx) ?? personalityFor(seat.id, this.difficulty, 0)
    const action = chooseAction(view, view.legal, personality)
    const result = applyAction(this.state, idx, action)
    if (result.error) {
      const fallback = view.legal.canCheck
        ? ({ type: 'check' } as const)
        : view.legal.canCall
          ? ({ type: 'call' } as const)
          : ({ type: 'fold' } as const)
      const retry = applyAction(this.state, idx, fallback)
      this.state = retry.state
      this.ingest(retry.events)
    } else {
      this.state = result.state
      this.ingest(result.events)
    }
    this.emit()
    this.queue()
  }

  private ingest(events: GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'hand-started':
          this.pushLog(`Hand #${event.handNumber}`, 'street')
          break
        case 'blinds-posted':
          for (const post of event.posts) {
            const name = this.seatName(post.seat)
            const kind = post.kind === 'sb' ? 'small blind' : 'big blind'
            this.pushLog(`${name} posts ${kind} ${formatChips(post.amount)}`, 'info')
          }
          break
        case 'street-dealt':
          this.pushLog(event.street === 'flop' ? 'The flop' : event.street === 'turn' ? 'The turn' : 'The river', 'street')
          break
        case 'action':
          this.pushLog(describeAction(this.seatName(event.seat), event.action, event.committed), 'action')
          break
        case 'uncalled-returned':
          this.pushLog(`${this.seatName(event.seat)} is returned ${formatChips(event.amount)} uncalled`, 'info')
          break
        case 'hand-complete':
          for (const winner of event.winners) {
            const name = this.seatName(winner.seat)
            if (winner.foldedWin) {
              this.pushLog(`${name} wins ${formatChips(winner.amount)}`, 'win')
            } else {
              const hand = winner.hand ? ` with ${winner.hand.name}` : ''
              this.pushLog(`${name} wins ${formatChips(winner.amount)}${hand}`, 'win')
            }
          }
          break
        case 'game-over':
          this.pushLog('Not enough players left to deal.', 'info')
          break
        default:
          break
      }
    }
  }

  private seatName(index: number): string {
    const seat = this.state.seats[index]
    if (!seat) return `Seat ${index + 1}`
    return seat.isHuman ? 'You' : seat.name
  }

  private pushLog(text: string, tone: LogEntry['tone']): void {
    this.logId += 1
    this.log = [...this.log.slice(-80), { id: this.logId, text, tone }]
  }

  private computeSnapshot(): SessionSnapshot {
    const funded = fundedPlayers(this.state)
    const hero = this.state.seats[this.heroSeat]
    const heroAlive = Boolean(hero && hero.chips > 0)
    const othersAlive = funded.some((s) => !s.isHuman)
    let gameOver = false
    let gameOverReason: SessionSnapshot['gameOverReason'] = null
    const betweenHands =
      this.state.street === 'hand-complete' || this.state.street === 'showdown' || this.state.street === 'idle'
    if (betweenHands && !heroAlive) {
      gameOver = true
      gameOverReason = 'busted'
    } else if (betweenHands && heroAlive && !othersAlive) {
      gameOver = true
      gameOverReason = 'won'
    }

    return {
      view: publicView(this.state, this.heroSeat),
      log: this.log,
      thinkingSeat: this.thinkingSeat,
      startingStack: this.startingStack,
      difficulty: this.difficulty,
      gameOver,
      gameOverReason,
    }
  }

  private emit(): void {
    this.snapshot = this.computeSnapshot()
    for (const listener of this.listeners) listener()
  }
}

export function formatChips(amount: number): string {
  return amount.toLocaleString('en-US')
}

function describeAction(name: string, action: PlayerAction, committed: number): string {
  switch (action.type) {
    case 'fold':
      return `${name} folds`
    case 'check':
      return `${name} checks`
    case 'call':
      return `${name} calls ${formatChips(committed)}`
    case 'all-in':
      return `${name} is all-in`
    case 'raise-to':
      return `${name} puts ${formatChips(action.amount)} in`
  }
}

function buildTableConfig(config: SessionConfig): TableConfig {
  const names = AI_ROSTER.slice(0, config.opponents)
  return {
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    seed: config.seed,
    players: [
      {
        id: 'hero',
        name: config.playerName.trim() || 'You',
        isHuman: true,
        chips: config.startingStack,
      },
      ...names.map((name, i) => ({
        id: `ai-${i + 1}`,
        name,
        isHuman: false,
        chips: config.startingStack,
      })),
    ],
  }
}

function hashCode(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return Math.abs(hash)
}
