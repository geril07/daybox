import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTaskStore, type Task } from '@/modules/tasks'

import { DayView } from './DayView'

let idCounter = 0

function makeTask(overrides: Partial<Task> = {}): Task {
  idCounter++
  return {
    id: `t${idCounter}`,
    title: `Task ${idCounter}`,
    groupId: 'g1',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: idCounter,
    completed: false,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  idCounter = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-10T12:00:00'))
  useTaskStore.setState({ tasks: [] })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('DayView group filtering', () => {
  it('shows empty state when all tasks belong to a different group', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ groupId: 'g1', date: '2026-06-10', title: 'Work task' }),
      ],
    })

    render(<DayView view="today" selectedGroupId="g2" />)

    expect(screen.getByText('Nothing scheduled for today')).toBeTruthy()
  })

  it('shows tasks when they match the selected group', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ groupId: 'g1', date: '2026-06-10', title: 'Work task' }),
      ],
    })

    render(<DayView view="today" selectedGroupId="g1" />)

    expect(screen.getByText('Work task')).toBeTruthy()
  })

  it('filters overdue tasks by group', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({
          groupId: 'g1',
          date: '2026-06-05',
          title: 'Overdue work',
        }),
        makeTask({
          groupId: 'g2',
          date: '2026-06-05',
          title: 'Overdue personal',
        }),
        makeTask({
          groupId: 'g1',
          date: '2026-06-10',
          title: 'Today work',
        }),
      ],
    })

    render(<DayView view="today" selectedGroupId="g1" />)

    expect(screen.getByText('Overdue work')).toBeTruthy()
    expect(screen.queryByText('Overdue personal')).toBeNull()
  })

  it('shows overdue only for matching group with empty state for date tasks', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({
          groupId: 'g1',
          date: '2026-06-05',
          title: 'Overdue work',
        }),
      ],
    })

    // Tomorrow has no matching tasks for g1
    render(<DayView view="tomorrow" selectedGroupId="g1" />)

    expect(screen.getByText('Nothing planned for tomorrow yet.')).toBeTruthy()
    expect(screen.queryByText('Overdue work')).toBeNull()
    expect(screen.queryByText('Overdue')).toBeNull()
  })

  it('shows all groups when selectedGroupId is null', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ groupId: 'g1', date: '2026-06-10', title: 'G1 task' }),
        makeTask({ groupId: 'g2', date: '2026-06-10', title: 'G2 task' }),
      ],
    })

    render(<DayView view="today" selectedGroupId={null} />)

    expect(screen.getByText('G1 task')).toBeTruthy()
    expect(screen.getByText('G2 task')).toBeTruthy()
  })
})
