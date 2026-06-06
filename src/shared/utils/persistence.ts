import type { PersistOptions, PersistStorage } from 'zustand/middleware'

type ZodSchemaLike = {
  safeParse: (data: unknown) => { success: boolean; error?: unknown }
}

export interface ValidatedPersistOptions<S> {
  onRehydrateStorage?: PersistOptions<S, S>['onRehydrateStorage']
  storage?: PersistStorage<S>
}

export function createValidatedPersist<S>(
  name: string,
  schema: ZodSchemaLike,
  init: Partial<S>,
  options?: ValidatedPersistOptions<S>,
): PersistOptions<S, S> {
  const userOnRehydrate = options?.onRehydrateStorage
  const storage = options?.storage
  let warned = false

  return {
    name,
    // Only set `storage` when provided. zustand builds its options as
    // `{ storage: createJSONStorage(() => localStorage), ...baseOptions }`, so
    // passing `storage: undefined` would clobber that default and disable
    // persistence ("the given storage is currently unavailable").
    ...(storage ? { storage } : {}),
    onRehydrateStorage: (initialState) => {
      const userInner = userOnRehydrate?.(initialState)
      return (state, error) => {
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
        userInner?.(state, error)
      }
    },
  }
}
