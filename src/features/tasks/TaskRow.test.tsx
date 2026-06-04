import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useAppStore } from '@/app/store'
import TaskRow from '@/features/tasks/TaskRow'

beforeEach(() => {
  useAppStore.setState({
    version: 1,
    tasks: [],
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    settings: {
      timer: {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        alarmSound: 'bell',
        alarmVolume: 0.5,
        alarmRepeat: 3,
      },
      theme: 'light',
      weekStartDay: 1,
    },
    view: 'today',
    browseDate: null,
    focusedTaskId: null,
    stickyGroupId: null,
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
    useAppStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const checkbox = document.querySelector(
      '.rounded-full.border',
    ) as HTMLButtonElement
    fireEvent.click(checkbox)
    const storeTask = useAppStore.getState().tasks.find((t) => t.id === task.id)
    expect(storeTask?.completed).toBe(true)
  })

  it('enters and exits edit mode', () => {
    const task = createMockTask()
    useAppStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const title = screen.getAllByText('Test Task')[0]
    fireEvent.click(title)
    const input = document.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Edited' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const storeTask = useAppStore.getState().tasks.find((t) => t.id === task.id)
    expect(storeTask?.title).toBe('Edited')
  })

  it('deletes task on delete button click', () => {
    const task = createMockTask()
    useAppStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const deleteBtn = document.querySelector(
      '[title="Delete"]',
    ) as HTMLButtonElement
    fireEvent.click(deleteBtn)
    expect(
      useAppStore.getState().tasks.find((t) => t.id === task.id),
    ).toBeUndefined()
  })

  it('focuses task on focus button click', () => {
    const task = createMockTask()
    useAppStore.setState({ tasks: [task] })
    render(<TaskRow task={task} />)
    const focusBtn = document.querySelector(
      '[title="Focus"]',
    ) as HTMLButtonElement
    fireEvent.click(focusBtn)
    expect(useAppStore.getState().focusedTaskId).toBe('test-1')
  })
})
