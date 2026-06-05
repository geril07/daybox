import type { z } from 'zod'

export type Layer =
  | 'envelope'
  | 'record'
  | 'reference'
  | 'optional'
  | 'rehydrate'

export interface SafeParseAndRouteParams<T> {
  value: unknown
  schema: z.ZodType<T>
  layer: Layer
  defaultValue?: T
}

export type SafeParseAndRouteResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string }

export function safeParseAndRoute<T>(
  params: SafeParseAndRouteParams<T>,
): SafeParseAndRouteResult<T> {
  const { value, schema, layer, defaultValue } = params

  if (layer === 'optional' || layer === 'rehydrate') {
    const result = schema.safeParse(value)
    if (!result.success) {
      return {
        ok: true,
        data: defaultValue,
      } as unknown as SafeParseAndRouteResult<T>
    }
    return {
      ok: true,
      data: result.data,
    } as unknown as SafeParseAndRouteResult<T>
  }

  const result = schema.safeParse(value)
  if (!result.success) {
    const path = result.error.issues[0]?.path?.join('.') ?? 'root'
    const message = result.error.issues[0]?.message ?? 'Invalid value'

    if (layer === 'envelope') {
      return { ok: false, reason: 'Not a DayBox export file.' }
    }

    if (layer === 'record') {
      return { ok: false, reason: `Invalid at ${path}: ${message}` }
    }

    if (layer === 'reference') {
      return { ok: false, reason: `Invalid reference at ${path}: ${message}` }
    }
  }

  return {
    ok: true,
    data: result.data,
  } as unknown as SafeParseAndRouteResult<T>
}
