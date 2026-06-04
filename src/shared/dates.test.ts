import { describe, it, expect } from 'vitest'
import { isToday, isOverdue, getWeekRange } from './dates.ts'

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
