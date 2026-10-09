import { describe, expect, it } from 'vitest'

import { SeriesSchema, TaskSchema, TaskStateSchema } from '../schema'

const task = {
  id: 't1',
  title: 'Test',
  groupId: 'default',
  date: null,
  pomoEstimate: 0,
  pomoCompleted: 0,
  sortOrder: 0,
  completed: false,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const series = {
  id: 's1',
  title: 'Work',
  groupId: 'default',
  pomoEstimate: 1.5,
  weekdays: [1, 2, 3, 4, 5],
  active: true,
  skipDates: [],
  sortOrder: 0,
  createdAt: task.createdAt,
}

describe('recurrence schemas', () => {
  it('accepts fractional estimates and trims titles', () => {
    expect(SeriesSchema.parse({ ...series, title: ' Work ' }).title).toBe(
      'Work',
    )
  })
  it.each([[], [1, 1], [7], [-1], [1.5]])(
    'rejects invalid weekdays %j',
    (...weekdays) => {
      expect(SeriesSchema.safeParse({ ...series, weekdays }).success).toBe(
        false,
      )
    },
  )
  it('rejects duplicate and malformed skip dates', () => {
    for (const skipDates of [['2026-10-08', '2026-10-08'], ['next tuesday']]) {
      expect(SeriesSchema.safeParse({ ...series, skipDates }).success).toBe(
        false,
      )
    }
  })
  it('rejects either half of the occurrence identity', () => {
    expect(TaskSchema.safeParse({ ...task, seriesId: 's1' }).success).toBe(
      false,
    )
    expect(
      TaskSchema.safeParse({ ...task, occurrenceDate: '2026-10-06' }).success,
    ).toBe(false)
  })
  it('rejects duplicate occurrence identities but allows ordinary tasks', () => {
    const occurrence = { ...task, seriesId: 's1', occurrenceDate: '2026-10-06' }
    expect(
      TaskStateSchema.safeParse({
        tasks: [occurrence, { ...occurrence, id: 't2' }],
      }).success,
    ).toBe(false)
    expect(
      TaskStateSchema.parse({ tasks: [task, { ...task, id: 't2' }] }).tasks,
    ).toHaveLength(2)
  })
  it('loads legacy state with null identities and no series', () => {
    expect(TaskStateSchema.parse({ tasks: [task] })).toEqual({
      tasks: [{ ...task, seriesId: null, occurrenceDate: null }],
      series: [],
    })
  })
})
