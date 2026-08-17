let ctx: AudioContext | null = null
let enabled = true

function context(): AudioContext | null {
  if (!enabled) return null
  const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(next: boolean): void {
  enabled = next
}

export function isSoundEnabled(): boolean {
  return enabled
}

function tone(freq: number, duration: number, type: OscillatorType, gain = 0.05, delay = 0): void {
  const audio = context()
  if (!audio) return
  const osc = audio.createOscillator()
  const vol = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  vol.gain.value = 0
  osc.connect(vol)
  vol.connect(audio.destination)
  const start = audio.currentTime + delay
  vol.gain.linearRampToValueAtTime(gain, start + 0.01)
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playDeal(): void {
  tone(640, 0.06, 'triangle', 0.03)
}

export function playChip(): void {
  tone(220, 0.07, 'square', 0.025)
}

export function playFold(): void {
  tone(180, 0.1, 'sine', 0.03)
}

export function playWin(): void {
  tone(523, 0.12, 'triangle', 0.04)
  tone(659, 0.16, 'triangle', 0.035, 0.08)
}

export function playCheck(): void {
  tone(400, 0.05, 'sine', 0.02)
}
