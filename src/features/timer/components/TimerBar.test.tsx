import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useGroupStore } from '@/features/groups'

import { useTaskStore } from '../../tasks/store'
import { useTimerStore } from '../store'
import { TimerBar } from './TimerBar'

beforeEach(() => {
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
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
})
