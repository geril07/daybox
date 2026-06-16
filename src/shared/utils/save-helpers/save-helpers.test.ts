import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { detectDuplicateId, parseSliceInput } from './save-helpers'

const testSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  count: z.number(),
})

describe('parseSliceInput', () => {
  it('returns ok with parsed value on success', () => {
    const result = parseSliceInput('testSlice', testSchema, {
      version: 1,
      name: 'hello',
      count: 42,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ version: 1, name: 'hello', count: 42 })
  })

  it('returns error with path and message on zod failure', () => {
    const result = parseSliceInput('testSlice', testSchema, {
      version: 2,
      name: 'hello',
      count: 'not-a-number',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/^testSlice\.version: /)
  })

  it('formats error with root path when no path in issue', () => {
    const result = parseSliceInput('testSlice', z.string(), 42)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('testSlice.root:')
  })
})

describe('detectDuplicateId', () => {
  it('returns null when all IDs are unique', () => {
    const result = detectDuplicateId(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      (item) => item.id,
      'item',
      'testSlice',
    )

    expect(result).toBeNull()
  })

  it('returns error string when duplicate found', () => {
    const result = detectDuplicateId(
      [{ id: 'a' }, { id: 'b' }, { id: 'a' }],
      (item) => item.id,
      'item',
      'testSlice',
    )

    expect(result).toBe(
      'testSlice.2.id: Duplicate item id "a" (first at testSlice.0.id)',
    )
  })

  it('returns error for first duplicate found', () => {
    const result = detectDuplicateId(
      [{ id: 'x' }, { id: 'x' }, { id: 'x' }],
      (item) => item.id,
      'group',
      'groups',
    )

    expect(result).toBe(
      'groups.1.id: Duplicate group id "x" (first at groups.0.id)',
    )
  })
})
