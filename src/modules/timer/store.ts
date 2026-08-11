import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { createDebouncedStringStorage } from '@/shared/utils/debounced-storage'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { defaultDurationForPhase, isValidIntervalDurationMin } from './duration'
import { TimerStateSchema, TimerSettingsSchema } from './schema'
import type { TimerPhase, TimerSettings } from './types'

export {
  defaultDurationForPhase,
  isValidIntervalDurationMin,
  minDurationMinForElapsed,
  PHASE_DURATION_MAX,
  resolveIntervalDurationMin,
} from './duration'

export const timerStorage = createDebouncedStringStorage(localStorage, 1000)

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notificationsEnabled: true,
  alarmSound: 'bell',
  alarmVolume: 0.5,
  alarmRepeat: 3,
}

const timerInit: TimerState = {
  phase: 'focus' as TimerPhase,
  startedAt: null as number | null,
  elapsed: 0,
  sessionPomoCount: 0,
  isRunning: false,
  focusedTaskId: null as string | null,
  intervalDurationMin: null as number | null,
  settings: DEFAULT_TIMER_SETTINGS,
}

interface TimerState {
  phase: TimerPhase
  startedAt: number | null
  elapsed: number
  sessionPomoCount: number
  isRunning: boolean
  focusedTaskId: string | null
  intervalDurationMin: number | null
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
  resetSession: () => void
  togglePlayPause: () => void
  skip: (longBreakInterval: number) => void
  advancePhase: (opts: AdvancePhaseOpts) => void
  setPhase: (phase: TimerPhase) => void
  tick: () => void
  setFocusedTaskId: (id: string | null) => void
  focusTask: (id: string) => void
  setTimerSettings: (partial: Partial<TimerSettings>) => void
  setIntervalDurationMin: (minutes: number | null) => void
}

export type TimerStore = TimerState & TimerActions

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      phase: 'focus' as TimerPhase,
      startedAt: null,
      elapsed: 0,
      sessionPomoCount: 0,
      isRunning: false,
      focusedTaskId: null,
      intervalDurationMin: null,
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

      resetSession: () =>
        set({
          phase: 'focus',
          sessionPomoCount: 0,
          startedAt: null,
          elapsed: 0,
          isRunning: false,
          intervalDurationMin: null,
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
        // sessionPomoCount = focus intervals completed since the last long
        // break: a completed focus increments it, a completed long break
        // resets it, and a completed short break leaves it unchanged.
        const nextSessionCount =
          state.phase === 'longBreak'
            ? 0
            : state.phase === 'focus'
              ? state.sessionPomoCount + 1
              : state.sessionPomoCount
        set({
          phase: nextPhase,
          startedAt: autoStart ? Date.now() : null,
          elapsed: 0,
          isRunning: autoStart,
          sessionPomoCount: nextSessionCount,
          intervalDurationMin: null,
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
          intervalDurationMin: null,
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
        set({ focusedTaskId: id })
      },

      setTimerSettings: (partial) => {
        const state = get()
        const merged = { ...state.settings, ...partial }
        const result = TimerSettingsSchema.safeParse(merged)
        if (!result.success) {
          console.warn('[daybox] Invalid timer settings rejected', result.error)
          return
        }
        set({ settings: merged as TimerSettings })
      },

      setIntervalDurationMin: (minutes) => {
        const state = get()
        if (minutes === null) {
          set({ intervalDurationMin: null })
          return
        }
        if (!isValidIntervalDurationMin(minutes, state.phase, state.elapsed)) {
          console.warn('[daybox] Invalid interval duration rejected', {
            minutes,
            phase: state.phase,
            elapsed: state.elapsed,
          })
          return
        }
        const phaseDefault = defaultDurationForPhase(
          state.phase,
          state.settings,
        )
        set({
          intervalDurationMin: minutes === phaseDefault ? null : minutes,
        })
      },
    }),
    {
      name: 'daybox-timer',
      storage: createJSONStorage(() => timerStorage),
      onRehydrateStorage: createValidatedRehydrate<TimerStore>({
        name: 'daybox-timer',
        schema: TimerStateSchema,
        init: timerInit,
        afterValidate: (state) => {
          state.settings.notificationsEnabled ??= true
          state.intervalDurationMin ??= null
          if (state.isRunning && state.startedAt) {
            const now = Date.now()
            state.elapsed += now - state.startedAt
            state.startedAt = now
          }
        },
      }),
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
