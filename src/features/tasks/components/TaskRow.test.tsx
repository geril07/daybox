import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useGroupStore } from '@/features/groups/store'
import TaskRow from '@/features/tasks/components/TaskRow'
import { useTaskStore } from '@/features/tasks/store'
import { useTimerStore } from '@/features/timer/store'

beforeEach(() => {
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
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
  })
})

function createMockTask(overrides = {}) {
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

describe('TaskRow', () => {
  it('renders task title', () => {
    render(<TaskRow task={createMockTask()} />)
    const titles = screen.getAllByText('Test Task')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('toggles completion on checkbox click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const checkbox = document.querySelector(
      '.rounded-full.border',
    ) as HTMLButtonElement
    fireEvent.click(checkbox)
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.completed).toBe(true)
  })

  it('enters and exits edit mode', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const title = screen.getAllByText('Test Task')[0]
    fireEvent.click(title)
    const input = document.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Edited' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storeTask?.title).toBe('Edited')
  })

  it('deletes task on delete button click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const deleteBtn = document.querySelector(
      '[title="Delete"]',
    ) as HTMLButtonElement
    fireEvent.click(deleteBtn)
    expect(
      useTaskStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('focuses task on focus button click', () => {
    const task = createMockTask()
    useTaskStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const focusBtn = document.querySelector(
      '[title="Focus"]',
    ) as HTMLButtonElement
    fireEvent.click(focusBtn)
    expect(useTimerStore.getState().focusedTaskId).toBe('test-1')
  })
})
