type ZodSchemaLike = {
  safeParse: (data: unknown) => { success: boolean; error?: unknown }
}

export interface ValidatedPersistOptions {
  onRehydrateStorage?: () => (state: unknown) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createValidatedPersist<TInit = any>(
  name: string,
  schema: ZodSchemaLike,
  init: TInit,
  options?: ValidatedPersistOptions,
) {
  const userOnRehydrate = options?.onRehydrateStorage
  let warned = false

  return {
    name,
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
