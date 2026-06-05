import type { z } from 'zod'

import type { TaskSchema } from '@/features/tasks/schema'

export type Task = z.infer<typeof TaskSchema>
