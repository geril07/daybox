import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateId } from '@/shared/id'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('generateId', () => {
  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'generated-by-random-uuid',
    })

    expect(generateId()).toBe('generated-by-random-uuid')
  })

  it('falls back to Math.random when randomUUID is missing', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(generateId()).toBe('00000000-0000-4000-8000-000000000000')
  })
})
