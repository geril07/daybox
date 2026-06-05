import type { z } from 'zod'

import type { GroupSchema } from '@/features/groups/schema'

export type Group = z.infer<typeof GroupSchema>
