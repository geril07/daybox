import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlannerStore } from '@/modules/planner'
import { useTaskStore, type Task } from '@/modules/tasks'

import { ViewTabs } from './ViewTabs'

function makeTask(id: string, date: string): Task {
  return {
    id,
    title: id,
    groupId: 'default',
    date,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 5, 10, 2, 0))
  usePlannerStore.setState({
    weekStartDay: 1,
    browseDate: null,
    dayStartMinutes: 150,
  })
  useTaskStore.setState({
    tasks: [
      makeTask('previous-planner-day', '2026-06-09'),
      makeTask('next-planner-day', '2026-06-10'),
    ],
  })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('ViewTabs counts', () => {
  it('uses the effective planner date for Today and Tomorrow badges', () => {
    render(<ViewTabs value="today" onChange={vi.fn()} />)

    const tabs = screen.getAllByRole('tab')
    expect(within(tabs[0]).getByText('1')).toBeTruthy()
    expect(within(tabs[1]).getByText('1')).toBeTruthy()
  })
})
