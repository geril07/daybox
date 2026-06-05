import { z } from 'zod'

export const PlannerStateSchema = z.object({
  weekStartDay: z.number().int().min(0).max(6),
  browseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})
