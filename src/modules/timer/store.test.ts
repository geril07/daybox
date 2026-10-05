import { describe, it, expect, beforeEach } from 'vitest'

import {
  useTimerStore,
  getNextPhase,
  DEFAULT_TIMER_SETTINGS,
  timerStorage,
  resolveIntervalDurationMin,
  minDurationMinForElapsed,
  isValidIntervalDurationMin,
} from '@/modules/timer'

beforeEach(() => {
  timerStorage.flush()
  localStorage.clear()
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    intervalDurationMin: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
  timerStorage.flush()
})

function writePersistedTimerState(settings: object) {
  localStorage.setItem(
    'daybox-timer',
    JSON.stringify({
      state: {
        phase: 'focus',
        startedAt: null,
        elapsed: 0,
        sessionPomoCount: 0,
        isRunning: false,
        focusedTaskId: null,
        settings,
      },
    }),
  )
}

describe('Timer Store', () => {
  describe('manual cycle progress', () => {
    it.each(['focus', 'shortBreak', 'longBreak'] as const)(
      'pauses %s without losing elapsed time or changing the interval',
      (phase) => {
        useTimerStore.setState({
          phase,
          sessionPomoCount: 2,
          elapsed: 60_000,
          startedAt: Date.now() - 5000,
          isRunning: true,
          intervalDurationMin: 10,
          focusedTaskId: 'task-1',
        })
        useTimerStore.getState().setSessionPomoCount(3)
        expect(useTimerStore.getState()).toMatchObject({
          phase,
          sessionPomoCount: 3,
          startedAt: null,
          isRunning: false,
          intervalDurationMin: 10,
          focusedTaskId: 'task-1',
        })
        expect(useTimerStore.getState().elapsed).toBeGreaterThanOrEqual(65_000)
        timerStorage.flush()
        const saved = JSON.parse(localStorage.getItem('daybox-timer')!)
        expect(saved.state.sessionPomoCount).toBe(3)
        expect(saved.state.isRunning).toBe(false)
      },
    )

    it.each([-1, 1.5, NaN, Infinity, 5])(
      'rejects invalid count %s',
      (count) => {
        useTimerStore.getState().setSessionPomoCount(count)
        expect(useTimerStore.getState().sessionPomoCount).toBe(0)
      },
    )

    it('allows excess progress to be reduced one step at a time', () => {
      useTimerStore.setState({ sessionPomoCount: 7 })
      useTimerStore.getState().setSessionPomoCount(6)
      expect(useTimerStore.getState().sessionPomoCount).toBe(6)
      useTimerStore.getState().setSessionPomoCount(7)
      expect(useTimerStore.getState().sessionPomoCount).toBe(6)
    })

    it('preserves paused elapsed time and does not pause on an unchanged count', () => {
      useTimerStore.setState({ elapsed: 60_000 })
      useTimerStore.getState().setSessionPomoCount(2)
      expect(useTimerStore.getState().elapsed).toBe(60_000)
      useTimerStore.getState().start()
      useTimerStore.getState().setSessionPomoCount(2)
      expect(useTimerStore.getState().isRunning).toBe(true)
    })
  })

  it('starts and pauses', () => {
    const store = useTimerStore.getState()
    store.start()
    expect(useTimerStore.getState().isRunning).toBe(true)
    store.pause()
    expect(useTimerStore.getState().isRunning).toBe(false)
  })

  it('resets', () => {
    const store = useTimerStore.getState()
    store.start()
    store.reset()
    expect(useTimerStore.getState().isRunning).toBe(false)
    expect(useTimerStore.getState().elapsed).toBe(0)
  })

  it('sets focusedTaskId', () => {
    useTimerStore.getState().setFocusedTaskId('task-1')
    expect(useTimerStore.getState().focusedTaskId).toBe('task-1')
    useTimerStore.getState().setFocusedTaskId(null)
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })

  describe('togglePlayPause', () => {
    it('starts when idle', () => {
      useTimerStore.getState().togglePlayPause()
      expect(useTimerStore.getState().isRunning).toBe(true)
    })

    it('pauses when running', () => {
      const store = useTimerStore.getState()
      store.start()
      store.togglePlayPause()
      expect(useTimerStore.getState().isRunning).toBe(false)
    })

    it('resumes when paused with elapsed', () => {
      useTimerStore.setState({ elapsed: 1000, isRunning: false })
      useTimerStore.getState().togglePlayPause()
      const state = useTimerStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.elapsed).toBe(1000)
    })
  })

  describe('advancePhase', () => {
    it('focus -> shortBreak increments session count', () => {
      useTimerStore.setState({ phase: 'focus', sessionPomoCount: 0 })
      useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      const state = useTimerStore.getState()
      expect(state.phase).toBe('shortBreak')
      expect(state.sessionPomoCount).toBe(1)
      expect(state.isRunning).toBe(false)
      expect(state.elapsed).toBe(0)
    })

    it('focus -> longBreak at interval', () => {
      useTimerStore.setState({ phase: 'focus', sessionPomoCount: 3 })
      useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(4)
    })

    it('break -> focus resets session count', () => {
      useTimerStore.setState({ phase: 'longBreak', sessionPomoCount: 4 })
      useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      const state = useTimerStore.getState()
      expect(state.phase).toBe('focus')
      expect(state.sessionPomoCount).toBe(0)
    })

    it('autoStart begins the next phase running', () => {
      useTimerStore.setState({ phase: 'focus', sessionPomoCount: 0 })
      useTimerStore
        .getState()
        .advancePhase({ autoStart: true, longBreakInterval: 4 })
      const state = useTimerStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).not.toBeNull()
    })

    it('shortBreak -> focus keeps the session count', () => {
      useTimerStore.setState({ phase: 'shortBreak', sessionPomoCount: 2 })
      useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      const state = useTimerStore.getState()
      expect(state.phase).toBe('focus')
      expect(state.sessionPomoCount).toBe(2)
    })

    it('runs a full cycle and fires a long break at the interval', () => {
      const advance = () =>
        useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      useTimerStore.setState({ phase: 'focus', sessionPomoCount: 0 })

      // focus #1 -> short, count 1
      advance()
      expect(useTimerStore.getState().phase).toBe('shortBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(1)
      advance() // short -> focus, count stays 1
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(1)

      // focus #2 -> short, count 2
      advance()
      expect(useTimerStore.getState().phase).toBe('shortBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(2)
      advance()
      expect(useTimerStore.getState().sessionPomoCount).toBe(2)

      // focus #3 -> short, count 3
      advance()
      expect(useTimerStore.getState().sessionPomoCount).toBe(3)
      advance()
      expect(useTimerStore.getState().sessionPomoCount).toBe(3)

      // focus #4 -> LONG break, count 4
      advance()
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(4)

      // long break -> focus, count resets to 0
      advance()
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(0)
    })

    it('keeps a long break due after the user manually bypasses it', () => {
      for (let i = 0; i < 7; i++) useTimerStore.getState().skip(4)
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(4)

      useTimerStore.getState().setPhase('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(4)

      useTimerStore.getState().skip(4)
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(5)

      useTimerStore.getState().skip(4)
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(0)
    })

    it('schedules a long break after the interval is reduced below progress', () => {
      useTimerStore.getState().setTimerSettings({ longBreakInterval: 8 })
      for (let i = 0; i < 10; i++) useTimerStore.getState().skip(8)
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(5)

      useTimerStore.getState().setTimerSettings({ longBreakInterval: 4 })
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(5)

      useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(6)
    })

    it('preserves a persisted excess count and recovers through a long break', async () => {
      useTimerStore.setState({ sessionPomoCount: 5 })
      timerStorage.flush()
      useTimerStore.getState().resetSession()
      await useTimerStore.persist.rehydrate()
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(5)

      useTimerStore.getState().skip(4)
      expect(useTimerStore.getState().phase).toBe('longBreak')
      expect(useTimerStore.getState().sessionPomoCount).toBe(6)

      useTimerStore.getState().skip(4)
      expect(useTimerStore.getState().phase).toBe('focus')
      expect(useTimerStore.getState().sessionPomoCount).toBe(0)
    })
  })

  describe('resetSession', () => {
    it('returns to the first focus with count 0, stopped', () => {
      useTimerStore.setState({
        phase: 'longBreak',
        sessionPomoCount: 3,
        elapsed: 5000,
        isRunning: true,
        startedAt: Date.now(),
      })
      useTimerStore.getState().resetSession()
      const state = useTimerStore.getState()
      expect(state.phase).toBe('focus')
      expect(state.sessionPomoCount).toBe(0)
      expect(state.elapsed).toBe(0)
      expect(state.isRunning).toBe(false)
      expect(state.startedAt).toBeNull()
    })
  })

  describe('reset vs resetSession scope', () => {
    it('reset zeroes the interval but preserves phase and count', () => {
      useTimerStore.setState({
        phase: 'shortBreak',
        sessionPomoCount: 2,
        elapsed: 5000,
      })
      useTimerStore.getState().reset()
      const state = useTimerStore.getState()
      expect(state.elapsed).toBe(0)
      expect(state.phase).toBe('shortBreak')
      expect(state.sessionPomoCount).toBe(2)
    })
  })

  describe('setPhase', () => {
    it('switches phase and resets the interval without changing the count', () => {
      useTimerStore.setState({
        phase: 'focus',
        sessionPomoCount: 2,
        elapsed: 5000,
        isRunning: true,
        startedAt: Date.now(),
      })
      useTimerStore.getState().setPhase('longBreak')
      const state = useTimerStore.getState()
      expect(state.phase).toBe('longBreak')
      expect(state.sessionPomoCount).toBe(2)
      expect(state.elapsed).toBe(0)
      expect(state.isRunning).toBe(false)
    })
  })

  describe('focusTask (pure rebind)', () => {
    it('rebinds focused task and preserves clock state', () => {
      useTimerStore.setState({ phase: 'shortBreak', elapsed: 5000 })
      useTimerStore.getState().focusTask('task-1')
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBe('task-1')
      expect(state.phase).toBe('shortBreak')
      expect(state.elapsed).toBe(5000)
    })

    it('preserves running state when refocusing', () => {
      const startedAt = Date.now() - 3000
      useTimerStore.setState({
        phase: 'focus',
        isRunning: true,
        startedAt,
        elapsed: 0,
      })
      useTimerStore.getState().focusTask('task-1')
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBe('task-1')
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).toBe(startedAt)
      expect(state.phase).toBe('focus')
      expect(state.elapsed).toBe(0)
    })

    it('preserves running break state', () => {
      const startedAt = Date.now() - 7500
      useTimerStore.setState({
        phase: 'shortBreak',
        isRunning: true,
        startedAt,
        elapsed: 7500,
      })
      useTimerStore.getState().focusTask('task-2')
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBe('task-2')
      expect(state.phase).toBe('shortBreak')
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).toBe(startedAt)
      expect(state.elapsed).toBe(7500)
    })

    it('preserves idle timer state', () => {
      useTimerStore.setState({
        phase: 'focus',
        isRunning: false,
        startedAt: null,
        elapsed: 0,
      })
      useTimerStore.getState().focusTask('task-2')
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBe('task-2')
      expect(state.phase).toBe('focus')
      expect(state.isRunning).toBe(false)
      expect(state.startedAt).toBeNull()
      expect(state.elapsed).toBe(0)
    })

    it('clears focus when re-focusing the same task', () => {
      useTimerStore.setState({ focusedTaskId: 'task-1' })
      useTimerStore.getState().focusTask('task-1')
      expect(useTimerStore.getState().focusedTaskId).toBeNull()
    })
  })
})

describe('getNextPhase', () => {
  it('focus -> shortBreak before interval', () => {
    expect(getNextPhase('focus', 1, 4)).toBe('shortBreak')
  })

  it('focus -> longBreak at interval', () => {
    expect(getNextPhase('focus', 3, 4)).toBe('longBreak')
  })

  it('shortBreak -> focus', () => {
    expect(getNextPhase('shortBreak', 1, 4)).toBe('focus')
  })

  it('longBreak -> focus', () => {
    expect(getNextPhase('longBreak', 1, 4)).toBe('focus')
  })
})

describe('interval duration override', () => {
  it('setIntervalDurationMin sets a one-shot override without touching settings', () => {
    useTimerStore.getState().setIntervalDurationMin(45)
    const state = useTimerStore.getState()
    expect(state.intervalDurationMin).toBe(45)
    expect(state.settings.focusDuration).toBe(
      DEFAULT_TIMER_SETTINGS.focusDuration,
    )
  })

  it('clears to null when set to the phase default', () => {
    useTimerStore.getState().setIntervalDurationMin(45)
    useTimerStore.getState().setIntervalDurationMin(25)
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('clears when set to null', () => {
    useTimerStore.getState().setIntervalDurationMin(40)
    useTimerStore.getState().setIntervalDurationMin(null)
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('rejects values at or below elapsed', () => {
    useTimerStore.setState({ elapsed: 10 * 60_000 })
    useTimerStore.getState().setIntervalDurationMin(10)
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
    useTimerStore.getState().setIntervalDurationMin(5)
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('allows values strictly above elapsed when paused', () => {
    useTimerStore.setState({ elapsed: 10 * 60_000 })
    useTimerStore.getState().setIntervalDurationMin(11)
    expect(useTimerStore.getState().intervalDurationMin).toBe(11)
  })

  it('rejects out-of-bounds for phase', () => {
    useTimerStore.setState({ phase: 'shortBreak' })
    useTimerStore.getState().setIntervalDurationMin(90)
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('clears on advancePhase', () => {
    useTimerStore.setState({ intervalDurationMin: 40 })
    useTimerStore.getState().advancePhase({ longBreakInterval: 4 })
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('clears on setPhase', () => {
    useTimerStore.setState({ intervalDurationMin: 40 })
    useTimerStore.getState().setPhase('shortBreak')
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('clears on resetSession', () => {
    useTimerStore.setState({ intervalDurationMin: 40, sessionPomoCount: 2 })
    useTimerStore.getState().resetSession()
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })

  it('keeps override on reset (interval restart)', () => {
    useTimerStore.setState({
      intervalDurationMin: 40,
      elapsed: 5000,
      isRunning: true,
      startedAt: Date.now(),
    })
    useTimerStore.getState().reset()
    const state = useTimerStore.getState()
    expect(state.intervalDurationMin).toBe(40)
    expect(state.elapsed).toBe(0)
    expect(state.isRunning).toBe(false)
  })

  it('resolveIntervalDurationMin uses override or phase default', () => {
    expect(
      resolveIntervalDurationMin('focus', DEFAULT_TIMER_SETTINGS, null),
    ).toBe(25)
    expect(
      resolveIntervalDurationMin('focus', DEFAULT_TIMER_SETTINGS, 15),
    ).toBe(15)
    expect(
      resolveIntervalDurationMin('shortBreak', DEFAULT_TIMER_SETTINGS, null),
    ).toBe(5)
  })

  it('minDurationMinForElapsed and isValidIntervalDurationMin guard edge cases', () => {
    expect(minDurationMinForElapsed(0)).toBe(1)
    expect(minDurationMinForElapsed(10 * 60_000)).toBe(11)
    expect(minDurationMinForElapsed(10 * 60_000 + 1)).toBe(11)
    expect(isValidIntervalDurationMin(10, 'focus', 10 * 60_000)).toBe(false)
    expect(isValidIntervalDurationMin(11, 'focus', 10 * 60_000)).toBe(true)
    expect(isValidIntervalDurationMin(90, 'shortBreak', 0)).toBe(false)
  })

  it('persists and rehydrates intervalDurationMin', async () => {
    useTimerStore.getState().setIntervalDurationMin(40)
    timerStorage.flush()
    useTimerStore.setState({ intervalDurationMin: null })
    await useTimerStore.persist.rehydrate()
    expect(useTimerStore.getState().intervalDurationMin).toBe(40)
  })

  it('backfills missing intervalDurationMin on rehydrate', async () => {
    writePersistedTimerState(DEFAULT_TIMER_SETTINGS)
    await useTimerStore.persist.rehydrate()
    expect(useTimerStore.getState().intervalDurationMin).toBeNull()
  })
})

describe('Timer settings slice', () => {
  it('defaults to DEFAULT_TIMER_SETTINGS', () => {
    expect(useTimerStore.getState().settings).toEqual(DEFAULT_TIMER_SETTINGS)
  })

  it('setTimerSettings merges a single field without clobbering others', () => {
    useTimerStore.getState().setTimerSettings({ focusDuration: 30 })
    const settings = useTimerStore.getState().settings
    expect(settings.focusDuration).toBe(30)
    expect(settings.shortBreakDuration).toBe(
      DEFAULT_TIMER_SETTINGS.shortBreakDuration,
    )
    expect(settings.alarmSound).toBe(DEFAULT_TIMER_SETTINGS.alarmSound)
  })

  it('setTimerSettings merges multiple fields', () => {
    useTimerStore.getState().setTimerSettings({
      longBreakInterval: 6,
      autoStartBreaks: true,
      alarmVolume: 0.8,
    })
    const settings = useTimerStore.getState().settings
    expect(settings.longBreakInterval).toBe(6)
    expect(settings.autoStartBreaks).toBe(true)
    expect(settings.alarmVolume).toBe(0.8)
  })

  it('persists settings to the daybox-timer key', () => {
    useTimerStore.getState().setTimerSettings({ alarmRepeat: 5 })
    timerStorage.flush()
    const persisted = JSON.parse(localStorage.getItem('daybox-timer') ?? '{}')
    expect(persisted.state.settings.alarmRepeat).toBe(5)
  })

  it('backfills notificationsEnabled when rehydrating old persisted settings', async () => {
    const oldSettings = {
      focusDuration: DEFAULT_TIMER_SETTINGS.focusDuration,
      shortBreakDuration: DEFAULT_TIMER_SETTINGS.shortBreakDuration,
      longBreakDuration: DEFAULT_TIMER_SETTINGS.longBreakDuration,
      longBreakInterval: DEFAULT_TIMER_SETTINGS.longBreakInterval,
      autoStartBreaks: DEFAULT_TIMER_SETTINGS.autoStartBreaks,
      autoStartPomodoros: DEFAULT_TIMER_SETTINGS.autoStartPomodoros,
      alarmSound: DEFAULT_TIMER_SETTINGS.alarmSound,
      alarmVolume: DEFAULT_TIMER_SETTINGS.alarmVolume,
      alarmRepeat: DEFAULT_TIMER_SETTINGS.alarmRepeat,
    }
    writePersistedTimerState(oldSettings)

    await useTimerStore.persist.rehydrate()

    expect(useTimerStore.getState().settings.notificationsEnabled).toBe(true)
    expect(useTimerStore.getState().settings.keepNotificationsVisible).toBe(
      false,
    )
  })

  it('persists and restores the persistent-reminder preference', async () => {
    useTimerStore
      .getState()
      .setTimerSettings({ keepNotificationsVisible: true })
    timerStorage.flush()
    useTimerStore.setState({ settings: DEFAULT_TIMER_SETTINGS })
    await useTimerStore.persist.rehydrate()
    expect(useTimerStore.getState().settings.keepNotificationsVisible).toBe(
      true,
    )
  })

  it('preserves notificationsEnabled=false when rehydrating persisted settings', async () => {
    writePersistedTimerState({
      ...DEFAULT_TIMER_SETTINGS,
      notificationsEnabled: false,
    })

    await useTimerStore.persist.rehydrate()

    expect(useTimerStore.getState().settings.notificationsEnabled).toBe(false)
  })
})
