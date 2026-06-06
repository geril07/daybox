import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTaskStore } from '@/features/tasks'
import type { Task } from '@/features/tasks'

import { useWeekSections, defaultDateForView } from './queries'
import { usePlannerStore } from './store'

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

// 2026-06-10 is a Wednesday. Noon avoids timezone date-boundary issues.
beforeEach(() => {
  idCounter = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-10T12:00:00'))
  useTaskStore.setState({ tasks: [] })
  usePlannerStore.setState({ weekStartDay: 1, browseDate: null })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWeekSections', () => {
  it('trims already-passed days, keeping today through end of week', () => {
    const { result } = renderHook(() => useWeekSections())

    // weekStartDay=1 (Mon) → Mon Jun 8 ... Sun Jun 14; today is Wed Jun 10.
    const keys = result.current.map((s) => s.key)
    expect(keys).toEqual([
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ])
    // Past days of the week are absent.
    expect(keys).not.toContain('2026-06-08')
    expect(keys).not.toContain('2026-06-09')
  })

  it('labels today "Today", tomorrow "Tomorrow", and later days by date', () => {
    const { result } = renderHook(() => useWeekSections())

    const byKey = Object.fromEntries(result.current.map((s) => [s.key, s.label]))
    expect(byKey['2026-06-10']).toBe('Today')
    expect(byKey['2026-06-11']).toBe('Tomorrow')
    expect(byKey['2026-06-12']).toBe('Fri · Jun 12')
  })

  it('puts overdue first, sorted by date ascending, excluding completed', () => {
    useTaskStore.setState({
      tasks: [
        makeTask({ date: '2026-06-05' }),
        makeTask({ date: '2026-06-01' }),
        makeTask({ date: '2026-06-03', completed: true, completedAt: '2026-06-03T00:00:00.000Z' }),
        makeTask({ date: '2026-06-10' }), // today, not overdue
      ],
    })

    const { result } = renderHook(() => useWeekSections())

    const overdue = result.current[0]
    expect(overdue.key).toBe('overdue')
    expect(overdue.tone).toBe('destructive')
    expect(overdue.tasks.map((t) => t.date)).toEqual(['2026-06-01', '2026-06-05'])
  })

  it('omits the overdue section when there are no overdue tasks', () => {
    useTaskStore.setState({ tasks: [makeTask({ date: '2026-06-10' })] })

    const { result } = renderHook(() => useWeekSections())

    expect(result.current.some((s) => s.key === 'overdue')).toBe(false)
  })

  it('gives empty future days an emptyHint so they stay visible', () => {
    const { result } = renderHook(() => useWeekSections())

    const tomorrow = result.current.find((s) => s.key === '2026-06-11')
    expect(tomorrow?.tasks).toHaveLength(0)
    expect(tomorrow?.emptyHint).toBe('Nothing planned')
  })

  it('respects weekStartDay for the end-of-week boundary', () => {
    usePlannerStore.setState({ weekStartDay: 0 }) // Sunday → Sun Jun 7 ... Sat Jun 13

    const { result } = renderHook(() => useWeekSections())

    const keys = result.current.map((s) => s.key)
    expect(keys).toEqual([
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
    ])
  })

  it('reports an empty week (no overdue, all day sections empty)', () => {
    const { result } = renderHook(() => useWeekSections())

    expect(result.current.some((s) => s.key === 'overdue')).toBe(false)
    expect(result.current.every((s) => s.tasks.length === 0)).toBe(true)
  })
})

describe('defaultDateForView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today for the today view', () => {
    expect(defaultDateForView('today', 1)).toBe('2026-06-10')
  })

  it('returns tomorrow for the tomorrow view', () => {
    expect(defaultDateForView('tomorrow', 1)).toBe('2026-06-11')
  })

  it('returns today for the week view (regardless of weekStartDay)', () => {
    expect(defaultDateForView('week', 1)).toBe('2026-06-10')
    expect(defaultDateForView('week', 0)).toBe('2026-06-10')
  })

  it('returns undefined for the backlog view', () => {
    expect(defaultDateForView('backlog', 1)).toBeUndefined()
  })

  it('returns browseDate for the date view', () => {
    expect(defaultDateForView('date', 1, '2026-07-04')).toBe('2026-07-04')
  })

  it('returns undefined for the date view when browseDate is null', () => {
    expect(defaultDateForView('date', 1, null)).toBeUndefined()
  })
})
