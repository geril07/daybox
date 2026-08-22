import { describe, it, expect } from 'vitest'

import {
  addDaysToDate,
  getPlannerDate,
  getWeekRange,
  isOverdue,
  isToday,
  isTomorrow,
} from '@/shared/dates'

describe('isToday', () => {
  it('returns true for today', () => {
    const today = new Date().toLocaleDateString('en-CA')
    expect(isToday(today)).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday.toLocaleDateString('en-CA'))).toBe(false)
  })
})

describe('isOverdue', () => {
  it('returns true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 1)
    expect(isOverdue(future.toLocaleDateString('en-CA'))).toBe(false)
  })

  it('returns false for today', () => {
    const today = new Date().toLocaleDateString('en-CA')
    expect(isOverdue(today)).toBe(false)
  })
})

describe('effective planner date', () => {
  const beforeBoundary = new Date(2026, 5, 10, 2, 29)
  const atBoundary = new Date(2026, 5, 10, 2, 30)

  it('uses the previous calendar date before the configured boundary', () => {
    expect(getPlannerDate(beforeBoundary, 150)).toBe('2026-06-09')
  })

  it('starts the new planner date at the configured minute', () => {
    expect(getPlannerDate(atBoundary, 150)).toBe('2026-06-10')
  })

  it('keeps midnight behavior unchanged', () => {
    expect(getPlannerDate(beforeBoundary, 0)).toBe('2026-06-10')
  })

  it('derives tomorrow and overdue from the effective date', () => {
    expect(addDaysToDate(getPlannerDate(beforeBoundary, 150), 1)).toBe(
      '2026-06-10',
    )
    expect(isToday('2026-06-09', beforeBoundary, 150)).toBe(true)
    expect(isTomorrow('2026-06-10', beforeBoundary, 150)).toBe(true)
    expect(isOverdue('2026-06-08', beforeBoundary, 150)).toBe(true)
  })

  it('moves the week range when the boundary crosses midnight', () => {
    const before = new Date(2026, 5, 8, 2, 29)
    const at = new Date(2026, 5, 8, 2, 30)

    expect(getWeekRange(1, before, 150)).toEqual({
      start: '2026-06-01',
      end: '2026-06-07',
    })
    expect(getWeekRange(1, at, 150)).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    })
  })
})

describe('getWeekRange', () => {
  it('returns start and end within current week (Mon start)', () => {
    const range = getWeekRange(1)
    expect(range.start).toBeDefined()
    expect(range.end).toBeDefined()
    expect(range.start < range.end).toBe(true)
  })

  it('returns start and end within current week (Sun start)', () => {
    const range = getWeekRange(0)
    expect(range.start).toBeDefined()
    expect(range.end).toBeDefined()
    expect(range.start < range.end).toBe(true)
  })

  it('returns 6 days apart', () => {
    const range = getWeekRange(1)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diff).toBe(6)
  })
})
