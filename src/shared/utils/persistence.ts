import type { PersistStorage } from 'zustand/middleware'

type ZodSchemaLike = {
  safeParse: (data: unknown) => { success: boolean; error?: unknown }
}

export interface ValidatedPersistOptions<T = unknown> {
  onRehydrateStorage?: () => (state: unknown) => void
  storage?: PersistStorage<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createValidatedPersist<TInit = any>(
  name: string,
  schema: ZodSchemaLike,
  init: TInit,
  options?: ValidatedPersistOptions<TInit>,
) {
  const userOnRehydrate = options?.onRehydrateStorage
  const storage = options?.storage
  let warned = false

  return {
    name,
    storage,
    onRehydrateStorage:
      () => (state: Record<string, unknown> | undefined, error?: unknown) => {
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
          Object.assign(state, init as Record<string, unknown>)
          return
        }
        if (userOnRehydrate) {
          userOnRehydrate()(state)
        }
      },
  }
}
