import { describe, it, expect, beforeEach } from 'vitest'

import { useTimerStore, getNextPhase } from '@/features/timer/store'

beforeEach(() => {
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
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
