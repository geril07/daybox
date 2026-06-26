import { describe, expect, it } from 'vitest'

import {
  compactAllBuckets,
  compactBucket,
  nextSortOrder,
} from './store.helpers'
import type { Task } from './types'

function t(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 't',
    groupId: 'default',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('compactBucket', () => {
  it('returns the same array for an empty bucket', () => {
    const tasks: Task[] = []
    const result = compactBucket(tasks, '2026-06-08')
    expect(result).toEqual([])
  })

  it('sets sortOrder to 0 for a single-task bucket', () => {
    const tasks = [t({ id: 'a', date: '2026-06-08', sortOrder: 5 })]
    const result = compactBucket(tasks, '2026-06-08')
    expect(result[0].sortOrder).toBe(0)
  })

  it('fills gaps in a bucket', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-08', sortOrder: 2 }),
    ]
    const result = compactBucket(tasks, '2026-06-08')
    expect(result).toHaveLength(2)
    const byId = Object.fromEntries(result.map((x) => [x.id, x]))
    expect(byId['a'].sortOrder).toBe(0)
    expect(byId['b'].sortOrder).toBe(1)
  })

  it('heals duplicates in a bucket', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
      t({ id: 'c', date: '2026-06-08', sortOrder: 1 }),
      t({ id: 'd', date: '2026-06-08', sortOrder: 3 }),
    ]
    const result = compactBucket(tasks, '2026-06-08')
    const sorted = result
      .filter((x) => x.date === '2026-06-08')
      .sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted.map((x) => x.sortOrder)).toEqual([0, 1, 2, 3])
  })

  it('preserves object identity for tasks in other buckets', () => {
    const other = t({ id: 'other', date: '2026-06-09', sortOrder: 99 })
    const tasks = [t({ id: 'a', date: '2026-06-08', sortOrder: 0 }), other]
    const result = compactBucket(tasks, '2026-06-08')
    expect(result[1]).toBe(other)
    expect(result[1].sortOrder).toBe(99)
  })
})

describe('nextSortOrder', () => {
  it('returns 0 for an empty bucket', () => {
    expect(nextSortOrder([], '2026-06-08')).toBe(0)
  })

  it('returns max + 1 for a gapped bucket', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-08', sortOrder: 2 }),
    ]
    expect(nextSortOrder(tasks, '2026-06-08')).toBe(3)
  })

  it('handles the undated (null) bucket', () => {
    const tasks = [
      t({ id: 'a', date: null, sortOrder: 0 }),
      t({ id: 'b', date: null, sortOrder: 5 }),
    ]
    expect(nextSortOrder(tasks, null)).toBe(6)
  })

  it('ignores tasks from other buckets', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-09', sortOrder: 99 }),
    ]
    expect(nextSortOrder(tasks, '2026-06-08')).toBe(1)
  })
})

describe('compactAllBuckets', () => {
  it('compacts multiple date buckets', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-08', sortOrder: 2 }),
      t({ id: 'c', date: null, sortOrder: 0 }),
      t({ id: 'd', date: null, sortOrder: 0 }),
    ]
    const result = compactAllBuckets(tasks)
    const date8 = result.filter((x) => x.date === '2026-06-08')
    expect(date8.map((x) => x.sortOrder)).toEqual([0, 1])
    const undated = result.filter((x) => x.date === null)
    expect(undated.map((x) => x.sortOrder)).toEqual([0, 1])
  })

  it('is a no-op for already-clean data', () => {
    const tasks = [
      t({ id: 'a', date: '2026-06-08', sortOrder: 0 }),
      t({ id: 'b', date: '2026-06-08', sortOrder: 1 }),
      t({ id: 'c', date: '2026-06-09', sortOrder: 0 }),
    ]
    const result = compactAllBuckets(tasks)
    expect(result.map((x) => x.sortOrder)).toEqual([0, 1, 0])
  })
})
