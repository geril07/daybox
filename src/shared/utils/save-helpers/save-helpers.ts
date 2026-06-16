import type { ZodSchema } from 'zod'

import type { PrepareResult } from '@/shared/save-slice'

export function parseSliceInput<T>(
  sliceName: string,
  schema: ZodSchema<T>,
  input: unknown,
): PrepareResult<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `${sliceName}.${path}: ${message}`,
    }
  }

  return { ok: true, value: result.data }
}

export function detectDuplicateId<T>(
  items: T[],
  getId: (item: T) => string,
  label: string,
  sliceName: string,
): string | null {
  const seen = new Map<string, number>()
  for (const [index, item] of items.entries()) {
    const id = getId(item)
    const firstIndex = seen.get(id)
    if (firstIndex !== undefined) {
      return `${sliceName}.${index}.id: Duplicate ${label} id "${id}" (first at ${sliceName}.${firstIndex}.id)`
    }
    seen.set(id, index)
  }
  return null
}
