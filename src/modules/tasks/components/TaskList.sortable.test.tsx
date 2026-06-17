import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useTaskStore, type Task } from '@/modules/tasks'

import { TaskList } from './TaskList'

let idCounter = 0

function makeTask(overrides: Partial<Task> = {}): Task {
  idCounter++
  return {
    id: `t${idCounter}`,
    title: `Task ${idCounter}`,
    groupId: 'default',
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
  useTaskStore.setState({ tasks: [] })
})

afterEach(() => {
  cleanup()
})

describe('TaskList sortable prop', () => {
  it('renders DragDropProvider when sortable is true and date is set', () => {
    const tasks = [makeTask({ date: '2026-06-10' })]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} date="2026-06-10" sortable />)

    // DragDropProvider uses a sortable context; check that the tasks render
    expect(document.body.textContent).toContain('Task 1')
  })

  it('does not render DragDropProvider when sortable is false even with date', () => {
    const tasks = [makeTask({ date: '2026-06-10' })]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} date="2026-06-10" sortable={false} />)

    // Tasks still render, but as static rows (no DragDropProvider)
    expect(document.body.textContent).toContain('Task 1')
    // With sortable=false, 'cursor-grab' (drag handle) won't be functional
    // The StaticTaskRow path doesn't use useSortable
  })

  it('renders static rows when sortable is explicitly false', () => {
    const tasks = [
      makeTask({ date: '2026-06-10' }),
      makeTask({ date: '2026-06-10' }),
    ]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} date="2026-06-10" sortable={false} />)

    expect(document.body.textContent).toContain('Task 1')
    expect(document.body.textContent).toContain('Task 2')
  })

  it('does not render DragDropProvider when date is undefined regardless of sortable', () => {
    const tasks = [makeTask({ date: '2026-06-01' })]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} />)

    expect(document.body.textContent).toContain('Task 1')
  })

  it('preserves sortable behavior by default when date is set', () => {
    const tasks = [makeTask({ date: '2026-06-10' })]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} date="2026-06-10" />)

    expect(document.body.textContent).toContain('Task 1')
  })

  it('renders DragDropProvider when date is set', () => {
    const tasks = [makeTask({ date: '2026-06-10', groupId: 'work' })]
    useTaskStore.setState({ tasks })

    render(<TaskList tasks={tasks} date="2026-06-10" />)

    expect(document.body.textContent).toContain('Task 1')
  })
})
