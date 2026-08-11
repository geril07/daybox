import type { TimerPhase, TimerSettings } from './types'

export const PHASE_DURATION_MAX: Record<TimerPhase, number> = {
  focus: 180,
  shortBreak: 60,
  longBreak: 120,
}

export function defaultDurationForPhase(
  phase: TimerPhase,
  settings: TimerSettings,
): number {
  if (phase === 'shortBreak') return settings.shortBreakDuration
  if (phase === 'longBreak') return settings.longBreakDuration
  return settings.focusDuration
}

export function resolveIntervalDurationMin(
  phase: TimerPhase,
  settings: TimerSettings,
  intervalDurationMin: number | null,
): number {
  return intervalDurationMin ?? defaultDurationForPhase(phase, settings)
}

/** Minimum total minutes allowed given elapsed ms (must be strictly > elapsed). */
export function minDurationMinForElapsed(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1
  return Math.floor(elapsedMs / 60_000) + 1
}

export function isValidIntervalDurationMin(
  minutes: number,
  phase: TimerPhase,
  elapsedMs: number,
): boolean {
  if (!Number.isInteger(minutes)) return false
  if (minutes < 1) return false
  if (minutes > PHASE_DURATION_MAX[phase]) return false
  if (minutes * 60_000 <= elapsedMs) return false
  return true
}
