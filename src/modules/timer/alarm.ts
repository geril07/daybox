import { useTimerStore } from './store'

type SoundName = 'bell' | 'digital' | 'gentle' | 'ping'

let audioContext: AudioContext | null = null
let audioUnlocked = false
let resumePromise: Promise<boolean> | null = null

function createAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  if (typeof AudioContext === 'undefined') return null

  try {
    audioContext = new AudioContext()
    return audioContext
  } catch {
    return null
  }
}

async function resumeContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true
  if (ctx.state === 'closed') return false

  try {
    await ctx.resume()
  } catch {
    return false
  }

  return (ctx.state as AudioContextState) === 'running'
}

function resumeAudioContext(ctx: AudioContext): Promise<boolean> {
  if (resumePromise) return resumePromise

  const pending = resumeContext(ctx)
  resumePromise = pending
  void pending.then(() => {
    if (resumePromise === pending) resumePromise = null
  })
  return pending
}

/**
 * Attempts to unlock Web Audio from a trusted user interaction.
 *
 * This function deliberately owns context creation and resumption. Interval
 * alarms must not call it because a blocked alarm must never leave audio nodes
 * queued for a later user gesture.
 */
export async function unlockAudio(): Promise<boolean> {
  const ctx = createAudioContext()
  if (!ctx) return false

  if (ctx.state === 'running') {
    audioUnlocked = true
    return true
  }

  const ready = await resumeAudioContext(ctx)
  if (ready) audioUnlocked = true
  return ready
}

function getRunningAudioContext(): AudioContext | null {
  if (!audioUnlocked || !audioContext || audioContext.state !== 'running') {
    return null
  }
  return audioContext
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay: number,
): void {
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
  ctx: AudioContext,
  fromHz: number,
  toHz: number,
  duration: number,
  volume: number,
  delay: number = 0,
): void {
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
): boolean {
  const ctx = getRunningAudioContext()
  if (!ctx) return false

  try {
    const def = soundDefinitions[sound]
    for (let r = 0; r < repeat; r++) {
      const baseDelay = r * 0.35
      def.freqs.forEach((freq, i) => {
        playTone(
          ctx,
          freq,
          def.duration,
          def.type,
          volume,
          baseDelay + i * 0.12,
        )
      })
    }
    return true
  } catch {
    return false
  }
}

async function playClickAfterUnlock(
  fromHz: number,
  toHz: number,
): Promise<void> {
  try {
    if (!(await unlockAudio())) return

    const ctx = getRunningAudioContext()
    if (!ctx) return
    playSweep(ctx, fromHz, toHz, 0.06, 0.15)
  } catch {
    // Audio feedback must never reject a user gesture handler.
  }
}

export function playStartClick(): void {
  void playClickAfterUnlock(800, 1200)
}

export function playPauseClick(): void {
  void playClickAfterUnlock(1200, 800)
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
