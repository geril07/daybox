import { create } from 'zustand'
import type { TimerPhase } from '../shared/types'

interface TimerState {
  phase: TimerPhase
  startedAt: number | null
  elapsed: number
  sessionPomoCount: number
  isRunning: boolean
}

interface TimerActions {
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setPhase: (phase: TimerPhase) => void
  tick: () => void
  getRemainingSeconds: (focusDuration: number, shortBreakDuration: number, longBreakDuration: number) => number
  getDuration: (focusDuration: number, shortBreakDuration: number, longBreakDuration: number) => number
}

export type TimerStore = TimerState & TimerActions

export const useTimerStore = create<TimerStore>()((set, get) => ({
  phase: 'focus',
  startedAt: null,
  elapsed: 0,
  sessionPomoCount: 0,
  isRunning: false,

  start: () =>
    set({
      isRunning: true,
      startedAt: Date.now(),
    }),

  pause: () =>
    set(state => ({
      isRunning: false,
      elapsed: state.elapsed + (Date.now() - (state.startedAt ?? Date.now())),
      startedAt: null,
    })),

  reset: () =>
    set({
      isRunning: false,
      startedAt: null,
      elapsed: 0,
    }),

  skip: () => {
    const state = get()
    const nextPhase = getNextPhase(state.phase, state.sessionPomoCount, 4)
    set({
      phase: nextPhase,
      startedAt: null,
      elapsed: 0,
      isRunning: false,
      sessionPomoCount:
        nextPhase === 'longBreak' || nextPhase === 'shortBreak'
          ? state.sessionPomoCount + (state.phase === 'focus' ? 1 : 0)
          : state.sessionPomoCount,
    })
  },

  setPhase: phase =>
    set({
      phase,
      startedAt: null,
      elapsed: 0,
      isRunning: false,
    }),

  tick: () => {
    const state = get()
    if (!state.isRunning || !state.startedAt) return
    const now = Date.now()
    set({
      elapsed: state.elapsed + (now - state.startedAt),
      startedAt: now,
    })
  },

  getRemainingSeconds: (focusDuration, shortBreakDuration, longBreakDuration) => {
    const state = get()
    const duration = getPhaseDuration(state.phase, focusDuration, shortBreakDuration, longBreakDuration)
    const elapsedSeconds = state.elapsed / 1000
    return Math.max(0, duration * 60 - elapsedSeconds)
  },

  getDuration: (focusDuration, shortBreakDuration, longBreakDuration) => {
    return getPhaseDuration(get().phase, focusDuration, shortBreakDuration, longBreakDuration) * 60
  },
}))

function getPhaseDuration(
  phase: TimerPhase,
  focusDuration: number,
  shortBreakDuration: number,
  longBreakDuration: number,
): number {
  switch (phase) {
    case 'focus':
      return focusDuration
    case 'shortBreak':
      return shortBreakDuration
    case 'longBreak':
      return longBreakDuration
  }
}

export function getNextPhase(
  current: TimerPhase,
  sessionPomoCount: number,
  longBreakInterval: number,
): TimerPhase {
  if (current === 'focus') {
    if ((sessionPomoCount + 1) % longBreakInterval === 0) {
      return 'longBreak'
    }
    return 'shortBreak'
  }
  return 'focus'
}
