import type { PersistOptions } from 'zustand/middleware'

type ZodSchemaLike = {
  safeParse: (data: unknown) => { success: boolean; error?: unknown }
}

export type OnRehydrateStorage<S> = NonNullable<
  PersistOptions<S>['onRehydrateStorage']
>

export interface ValidatedRehydrateOptions<S> {
  name: string
  schema: ZodSchemaLike
  init: Partial<S>
  afterValidate?: (state: S) => void
}

export function createValidatedRehydrate<S>(
  options: ValidatedRehydrateOptions<S>,
): OnRehydrateStorage<S> {
  const { name, schema, init, afterValidate } = options
  let warned = false

  return () => (state, error) => {
    if (error) return
    if (!state) return
    const result = schema.safeParse(state)
    if (!result.success) {
      if (!warned) {
        warned = true
        console.warn(
          `[daybox] ${name}: persisted state invalid, resetting to defaults`,
          result.error,
        )
      }
      Object.assign(state, init)
      return
    }
    afterValidate?.(state)
  }
}
