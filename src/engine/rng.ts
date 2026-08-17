import type { RngState } from './types'

/** Mulberry32 — small, seedable, serializable PRNG. */
export function createRng(seed: number): RngState {
  return { s: seed >>> 0 }
}

export function rngNext(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0
  let t = rng.s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function rngInt(rng: RngState, maxExclusive: number): number {
  return Math.floor(rngNext(rng) * maxExclusive)
}
