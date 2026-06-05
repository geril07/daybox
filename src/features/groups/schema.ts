import { z } from 'zod'

export const GroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  color: z.string(),
  createdAt: z.string().datetime(),
})
