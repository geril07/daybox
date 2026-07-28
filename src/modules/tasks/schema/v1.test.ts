import { describe, expect, it } from 'vitest'

import { TaskSchema } from '../schema'

function validTask(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

describe('TaskSchema pomoEstimate', () => {
  it('accepts a fractional estimate', () => {
    const result = TaskSchema.safeParse(validTask({ pomoEstimate: 1.5 }))
    expect(result.success).toBe(true)
  })

  it('accepts an integer estimate', () => {
    const result = TaskSchema.safeParse(validTask({ pomoEstimate: 3 }))
    expect(result.success).toBe(true)
  })

  it('rejects an estimate above 99', () => {
    const result = TaskSchema.safeParse(validTask({ pomoEstimate: 99.5 }))
    expect(result.success).toBe(false)
  })
})
