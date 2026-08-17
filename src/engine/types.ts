export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
export type Suit = 's' | 'h' | 'd' | 'c'

export interface Card {
  rank: Rank
  suit: Suit
}

export type Street =
  | 'idle'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand-complete'

export type SeatStatus = 'empty' | 'active' | 'folded' | 'all-in' | 'sitting-out'

export interface Seat {
  index: number
  id: string
  name: string
  isHuman: boolean
  chips: number
  hole: [Card, Card] | null
  status: SeatStatus
  streetCommitted: number
  handCommitted: number
  actedThisStreet: boolean
  revealed: boolean
}

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise-to'; amount: number }
  | { type: 'all-in' }

export interface LegalActions {
  canFold: boolean
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canBet: boolean
  canRaise: boolean
  minRaiseTo: number
  maxRaiseTo: number
  canAllIn: boolean
  facingBet: boolean
}

export interface EvaluatedHand {
  category: HandCategory
  categoryRank: number
  ranks: number[]
  rankValue: number
  cards: Card[]
  name: string
}

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush'

export interface Pot {
  amount: number
  eligible: number[]
  label: string
}

export interface Award {
  seat: number
  amount: number
  potIndex: number
  potLabel: string
  hand: EvaluatedHand | null
  foldedWin: boolean
}

export interface WinnerInfo {
  seat: number
  amount: number
  hand: EvaluatedHand | null
  foldedWin: boolean
}

export interface RngState {
  s: number
}

export interface GameState {
  version: 1
  seed: number
  rng: RngState
  handNumber: number
  smallBlind: number
  bigBlind: number
  button: number
  sbIndex: number | null
  bbIndex: number | null
  street: Street
  board: Card[]
  deck: Card[]
  deckIndex: number
  seats: Seat[]
  currentToAct: number | null
  currentBet: number
  lastFullRaiseSize: number
  lastAggressor: number | null
  pots: Pot[]
  awards: Award[]
  winners: WinnerInfo[]
}

export interface TableConfig {
  players: Array<{
    id: string
    name: string
    isHuman: boolean
    chips: number
  }>
  smallBlind: number
  bigBlind: number
  seed?: number
}

export type GameEvent =
  | { type: 'hand-started'; handNumber: number; button: number }
  | { type: 'blinds-posted'; posts: Array<{ seat: number; amount: number; kind: 'sb' | 'bb' }> }
  | { type: 'hole-dealt' }
  | { type: 'action'; seat: number; action: PlayerAction; committed: number }
  | { type: 'uncalled-returned'; seat: number; amount: number }
  | { type: 'street-dealt'; street: 'flop' | 'turn' | 'river'; cards: Card[] }
  | { type: 'showdown'; awards: Award[] }
  | { type: 'hand-complete'; winners: WinnerInfo[] }
  | { type: 'game-over'; reason: 'one-player-left' }

export interface ApplyResult {
  state: GameState
  events: GameEvent[]
  error?: string
}

export interface PublicSeat {
  index: number
  id: string
  name: string
  isHuman: boolean
  chips: number
  hole: [Card, Card] | null
  status: SeatStatus
  streetCommitted: number
  handCommitted: number
  isButton: boolean
  isSB: boolean
  isBB: boolean
  toAct: boolean
}

export interface PublicView {
  handNumber: number
  street: Street
  board: Card[]
  potMiddle: number
  potTotal: number
  pots: Pot[]
  currentBet: number
  button: number
  sbIndex: number | null
  bbIndex: number | null
  currentToAct: number | null
  smallBlind: number
  bigBlind: number
  heroSeat: number | null
  heroHole: [Card, Card] | null
  seats: PublicSeat[]
  legal: LegalActions | null
  awards: Award[]
  winners: WinnerInfo[]
  youToAct: boolean
}
