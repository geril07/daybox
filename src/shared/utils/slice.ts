import type { z } from 'zod'

export interface Slice<T = unknown> {
  name: string
  schema: z.ZodType<T>
  export(): T
  apply(data: T): void
}
