import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { TimerPhase } from '@/shared/types'

export interface TimerSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  alarmSound: 'bell' | 'digital' | 'gentle' | 'ping'
  alarmVolume: number
  alarmRepeat: number
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: 'bell',
  alarmVolume: 0.5,
  alarmRepeat: 3,
}

interface TimerState {
  phase: TimerPhase
  startedAt: number | null
  elapsed: number
  sessionPomoCount: number
  isRunning: boolean
  focusedTaskId: string | null
  settings: TimerSettings
}

interface AdvancePhaseOpts {
  autoStart?: boolean
  longBreakInterval: number
}

interface TimerActions {
  start: () => void
  pause: () => void
  reset: () => void
  togglePlayPause: () => void
  skip: (longBreakInterval: number) => void
  advancePhase: (opts: AdvancePhaseOpts) => void
  setPhase: (phase: TimerPhase) => void
  tick: () => void
  setFocusedTaskId: (id: string | null) => void
  focusTask: (id: string) => void
  setTimerSettings: (partial: Partial<TimerSettings>) => void
}

export type TimerStore = TimerState & TimerActions

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      phase: 'focus',
      startedAt: null,
      elapsed: 0,
      sessionPomoCount: 0,
      isRunning: false,
      focusedTaskId: null,
      settings: DEFAULT_TIMER_SETTINGS,

      start: () =>
        set({
          isRunning: true,
          startedAt: Date.now(),
        }),

      pause: () =>
        set((state) => ({
          isRunning: false,
          elapsed:
            state.elapsed + (Date.now() - (state.startedAt ?? Date.now())),
          startedAt: null,
        })),

      reset: () =>
        set({
          isRunning: false,
          startedAt: null,
          elapsed: 0,
        }),

      togglePlayPause: () => {
        const state = get()
        if (state.isRunning) {
          state.pause()
        } else if (state.elapsed > 0) {
          state.start()
        } else {
          state.reset()
          state.start()
        }
      },

      advancePhase: ({ autoStart = false, longBreakInterval }) => {
        const state = get()
        const nextPhase = getNextPhase(
          state.phase,
          state.sessionPomoCount,
          longBreakInterval,
        )
        const completedFocus = state.phase === 'focus'
        const nextSessionCount =
          nextPhase === 'focus'
            ? 0
            : state.sessionPomoCount + (completedFocus ? 1 : 0)
        set({
          phase: nextPhase,
          startedAt: autoStart ? Date.now() : null,
          elapsed: 0,
          isRunning: autoStart,
          sessionPomoCount: nextSessionCount,
        })
      },

      skip: (longBreakInterval) => {
        get().advancePhase({ autoStart: false, longBreakInterval })
      },

      setPhase: (phase) =>
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

      setFocusedTaskId: (id) => set({ focusedTaskId: id }),

      focusTask: (id) => {
        const state = get()
        if (state.focusedTaskId === id) {
          set({ focusedTaskId: null })
          return
        }
        const wasRunning = state.isRunning
        set({
          focusedTaskId: id,
          phase: 'focus',
          elapsed: 0,
          startedAt: wasRunning ? Date.now() : null,
          isRunning: wasRunning,
        })
      },

      setTimerSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
    }),
    {
      name: 'daybox-timer',
      onRehydrateStorage: () => (state) => {
        if (state?.isRunning && state.startedAt) {
          const now = Date.now()
          state.elapsed += now - state.startedAt
          state.startedAt = now
        }
      },
    },
  ),
)

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
