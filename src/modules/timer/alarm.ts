import { useTimerStore } from './store'

type SoundName = 'bell' | 'digital' | 'gentle' | 'ping'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay: number,
): void {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + delay + duration,
  )
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration)
}

function playSweep(
  fromHz: number,
  toHz: number,
  duration: number,
  volume: number,
  delay: number = 0,
): void {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  const t0 = ctx.currentTime + delay
  osc.frequency.setValueAtTime(fromHz, t0)
  osc.frequency.linearRampToValueAtTime(toHz, t0 + duration)
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration)
}

const soundDefinitions: Record<
  SoundName,
  { freqs: number[]; duration: number; type: OscillatorType }
> = {
  bell: { freqs: [880, 1100], duration: 0.15, type: 'sine' },
  digital: { freqs: [660, 880, 1100], duration: 0.08, type: 'square' },
  gentle: { freqs: [440, 660], duration: 0.3, type: 'sine' },
  ping: { freqs: [1320], duration: 0.2, type: 'sine' },
}

export function playAlarm(
  sound: SoundName,
  volume: number,
  repeat: number,
): void {
  const def = soundDefinitions[sound]
  for (let r = 0; r < repeat; r++) {
    const baseDelay = r * 0.35
    def.freqs.forEach((freq, i) => {
      playTone(freq, def.duration, def.type, volume, baseDelay + i * 0.12)
    })
  }
}

export function playStartClick(): void {
  playSweep(800, 1200, 0.06, 0.15)
}

export function playPauseClick(): void {
  playSweep(1200, 800, 0.06, 0.15)
}

export function togglePlayPauseWithClick(): void {
  const state = useTimerStore.getState()
  if (state.isRunning) {
    playPauseClick()
  } else {
    playStartClick()
  }
  state.togglePlayPause()
}
