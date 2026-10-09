import type { z } from 'zod'

import type { TaskSchema, SeriesSchema } from './schema'

export type Task = z.infer<typeof TaskSchema>
export type Series = z.infer<typeof SeriesSchema>
