import { describe, it, expect } from 'vitest'

import {
  selectOverdue,
  selectForDate,
  selectInRange,
  selectUndated,
} from '@/modules/tasks'

import type { Task } from './types'

function createTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 'Test',
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

describe('selectOverdue', () => {
  const asOf = '2025-01-01'

  it('returns incomplete tasks with past dates', () => {
    const tasks = [
      createTask({ id: '1', date: '2024-01-01', completed: false }),
      createTask({ id: '2', date: '2024-01-02', completed: false }),
    ]
    expect(selectOverdue(tasks, asOf)).toHaveLength(2)
  })

  it('excludes completed tasks', () => {
    const tasks = [
      createTask({ id: '1', date: '2024-01-01', completed: true }),
      createTask({ id: '2', date: '2024-01-02', completed: false }),
    ]
    expect(selectOverdue(tasks, asOf)).toHaveLength(1)
  })

  it('excludes tasks without a date', () => {
    const tasks = [
      createTask({ id: '1', date: null }),
      createTask({ id: '2', date: '2024-01-01' }),
    ]
    expect(selectOverdue(tasks, asOf)).toHaveLength(1)
  })

  it('returns empty array when no overdue tasks', () => {
    expect(selectOverdue([], asOf)).toEqual([])
  })

  it('sorts by date then sortOrder', () => {
    const tasks = [
      createTask({ id: '1', date: '2024-01-02', sortOrder: 2 }),
      createTask({ id: '2', date: '2024-01-01', sortOrder: 1 }),
      createTask({ id: '3', date: '2024-01-01', sortOrder: 0 }),
    ]
    const result = selectOverdue(tasks, asOf)
    expect(result.map((t) => t.id)).toEqual(['3', '2', '1'])
  })
})

describe('selectForDate', () => {
  it('returns tasks matching the given date', () => {
    const tasks = [
      createTask({ id: '1', date: '2025-06-04' }),
      createTask({ id: '2', date: '2025-06-05' }),
    ]
    expect(selectForDate(tasks, '2025-06-04')).toHaveLength(1)
  })

  it('sorts by sortOrder', () => {
    const tasks = [
      createTask({ id: '1', date: '2025-06-04', sortOrder: 2 }),
      createTask({ id: '2', date: '2025-06-04', sortOrder: 0 }),
      createTask({ id: '3', date: '2025-06-04', sortOrder: 1 }),
    ]
    const result = selectForDate(tasks, '2025-06-04')
    expect(result.map((t) => t.id)).toEqual(['2', '3', '1'])
  })

  it('returns empty array when no tasks match', () => {
    const tasks = [createTask({ id: '1', date: '2025-06-04' })]
    expect(selectForDate(tasks, '2025-06-05')).toEqual([])
  })
})

describe('selectUndated', () => {
  it('returns tasks with null date', () => {
    const tasks = [
      createTask({ id: '1', date: null }),
      createTask({ id: '2', date: '2025-06-04' }),
    ]
    expect(selectUndated(tasks)).toHaveLength(1)
  })

  it('sorts by sortOrder', () => {
    const tasks = [
      createTask({ id: '1', date: null, sortOrder: 2 }),
      createTask({ id: '2', date: null, sortOrder: 0 }),
    ]
    const result = selectUndated(tasks)
    expect(result.map((t) => t.id)).toEqual(['2', '1'])
  })

  it('returns empty array when no undated tasks', () => {
    const tasks = [createTask({ id: '1', date: '2025-06-04' })]
    expect(selectUndated(tasks)).toHaveLength(0)
  })
})

describe('selectInRange', () => {
  it('returns tasks within the date range', () => {
    const tasks = [
      createTask({ id: '1', date: '2025-06-01' }),
      createTask({ id: '2', date: '2025-06-15' }),
      createTask({ id: '3', date: '2025-07-01' }),
    ]
    expect(selectInRange(tasks, '2025-06-01', '2025-06-30')).toHaveLength(2)
  })

  it('sorts by date then sortOrder', () => {
    const tasks = [
      createTask({ id: '1', date: '2025-06-02', sortOrder: 2 }),
      createTask({ id: '2', date: '2025-06-01', sortOrder: 1 }),
      createTask({ id: '3', date: '2025-06-01', sortOrder: 0 }),
    ]
    const result = selectInRange(tasks, '2025-06-01', '2025-06-07')
    expect(result.map((t) => t.id)).toEqual(['3', '2', '1'])
  })

  it('excludes tasks without a date', () => {
    const tasks = [
      createTask({ id: '1', date: null }),
      createTask({ id: '2', date: '2025-06-04' }),
    ]
    expect(selectInRange(tasks, '2025-06-01', '2025-06-30')).toHaveLength(1)
  })

  it('returns empty array when no tasks in range', () => {
    const tasks = [createTask({ id: '1', date: '2025-05-01' })]
    expect(selectInRange(tasks, '2025-06-01', '2025-06-30')).toHaveLength(0)
  })
})
