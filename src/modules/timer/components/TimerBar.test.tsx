import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'

import { unlockAudio } from '../alarm'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '../store'
import { TimerBar } from './TimerBar'

type NotificationMock = typeof Notification & {
  permission: NotificationPermission
  instances: Array<
    Notification & { title: string; options?: NotificationOptions }
  >
}

const getNotificationMock = () => Notification as unknown as NotificationMock

type AudioContextMockApi = {
  initialState: AudioContextState
  oscillatorBehavior: 'create' | 'throw'
  instances: Array<{
    state: AudioContextState
    oscillators: unknown[]
  }>
}

const getAudioContextMock = () => AudioContext as unknown as AudioContextMockApi

beforeEach(() => {
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
  const notification = getNotificationMock()
  notification.permission = 'default'
  notification.instances = []
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function createTask(overrides = {}) {
  return {
    id: 'test-1',
    title: 'Test Task',
    groupId: 'default',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function fireFocusComplete(taskId: string) {
  const focusMs = useTimerStore.getState().settings.focusDuration * 60 * 1000
  useTimerStore.setState({
    phase: 'focus',
    focusedTaskId: taskId,
    startedAt: Date.now() - 1000,
    elapsed: focusMs + 1,
    isRunning: true,
  })
}

describe('TimerBar', () => {
  it('increments pomoCompleted past pomoEstimate = 0 on focus complete', () => {
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)
    render(<TimerBar />)
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(1)
    expect(updated?.pomoEstimate).toBe(0)
  })

  it('increments pomoCompleted past pomoEstimate on focus complete', () => {
    const task = createTask({ pomoEstimate: 3, pomoCompleted: 3 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)
    render(<TimerBar />)
    const updated = useTaskStore.getState().tasks[0]
    expect(updated?.pomoCompleted).toBe(4)
    expect(updated?.pomoEstimate).toBe(3)
  })

  it('does not send a notification when the tab is visible', () => {
    const notification = getNotificationMock()
    notification.permission = 'granted'
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(notification.instances).toHaveLength(0)
    expect(useTaskStore.getState().tasks[0]?.pomoCompleted).toBe(1)
  })

  it('sends a notification when the tab is hidden and focuses the window on click', () => {
    const notification = getNotificationMock()
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})
    notification.permission = 'granted'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    const task = createTask({ pomoEstimate: 0, pomoCompleted: 0 })
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(notification.instances).toHaveLength(1)
    expect(notification.instances[0].title).toBe('Focus complete!')
    expect(notification.instances[0].onclick).toEqual(expect.any(Function))

    notification.instances[0].onclick?.call(
      notification.instances[0],
      new Event('click'),
    )
    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it('continues interval completion when audio graph creation throws', async () => {
    const audio = getAudioContextMock()
    const notification = getNotificationMock()
    notification.permission = 'granted'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await expect(unlockAudio()).resolves.toBe(true)
    audio.oscillatorBehavior = 'throw'
    const task = createTask()
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(useTimerStore.getState().phase).toBe('shortBreak')
    expect(useTaskStore.getState().tasks[0]?.pomoCompleted).toBe(1)
    expect(notification.instances).toHaveLength(1)
  })

  describe('clear focus button', () => {
    it('is hidden when focusedTaskId is null', () => {
      render(<TimerBar />)
      expect(screen.queryByRole('button', { name: 'Clear focus' })).toBeNull()
    })

    it('is visible when a task is focused and exists in the store', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({ focusedTaskId: task.id })
      render(<TimerBar />)
      expect(
        screen.queryByRole('button', { name: 'Clear focus' }),
      ).not.toBeNull()
    })

    it('is visible when the focused task is stale (not in the store)', () => {
      useTimerStore.setState({ focusedTaskId: 'stale-task' })
      render(<TimerBar />)
      expect(
        screen.queryByRole('button', { name: 'Clear focus' }),
      ).not.toBeNull()
    })

    it('sets focusedTaskId to null when clicked', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({ focusedTaskId: task.id })
      render(<TimerBar />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear focus' }))
      expect(useTimerStore.getState().focusedTaskId).toBeNull()
    })

    it('does not disturb timer state when clicked', () => {
      const task = createTask()
      useTaskStore.setState({ tasks: [task] })
      useTimerStore.setState({
        focusedTaskId: task.id,
        phase: 'focus',
        elapsed: 60000,
        isRunning: true,
        startedAt: Date.now() - 1000,
        sessionPomoCount: 2,
      })
      render(<TimerBar />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear focus' }))
      const state = useTimerStore.getState()
      expect(state.focusedTaskId).toBeNull()
      expect(state.phase).toBe('focus')
      expect(state.elapsed).toBe(60000)
      expect(state.isRunning).toBe(true)
      expect(state.startedAt).toBeGreaterThan(0)
      expect(state.sessionPomoCount).toBe(2)
    })
  })

  it('does not replay an interval alarm after audio unlocks later', async () => {
    const audio = getAudioContextMock()
    await expect(unlockAudio()).resolves.toBe(true)
    const context = audio.instances[0]
    expect(context).toBeDefined()
    context!.state = 'suspended'
    audio.oscillatorBehavior = 'create'
    const task = createTask()
    useTaskStore.setState({ tasks: [task] })
    fireFocusComplete(task.id)

    render(<TimerBar />)

    expect(useTimerStore.getState().phase).toBe('shortBreak')
    const oscillatorCount = context?.oscillators.length ?? 0

    await expect(unlockAudio()).resolves.toBe(true)
    expect(context?.oscillators).toHaveLength(oscillatorCount)
  })
})
