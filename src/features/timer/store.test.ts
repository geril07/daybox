import { describe, it, expect, beforeEach } from 'vitest'

import {
  useTimerStore,
  getNextPhase,
  DEFAULT_TIMER_SETTINGS,
} from '@/features/timer'

beforeEach(() => {
  localStorage.clear()
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
})

describe('Timer Store', () => {
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
  })

  describe('focusTask', () => {
    it('sets focused task and resets phase to focus', () => {
      useTimerStore.setState({ phase: 'shortBreak', elapsed: 5000 })
      useTimerStore.getState().focusTask('task-1')
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBe('task-1')
      expect(state.phase).toBe('focus')
      expect(state.elapsed).toBe(0)
    })

    it('preserves running state when refocusing', () => {
      useTimerStore.setState({ isRunning: true, startedAt: Date.now() })
      useTimerStore.getState().focusTask('task-1')
      const state = useTimerStore.getState()
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).not.toBeNull()
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
    const persisted = JSON.parse(localStorage.getItem('daybox-timer') ?? '{}')
    expect(persisted.state.settings.alarmRepeat).toBe(5)
  })
})
