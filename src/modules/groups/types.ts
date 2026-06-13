import type { z } from 'zod'

import type { GroupSchema } from './schema'

export type Group = z.infer<typeof GroupSchema>
