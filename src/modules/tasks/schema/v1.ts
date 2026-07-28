import { z } from 'zod'

export const TaskV1Schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(280),
  groupId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  pomoEstimate: z.number().min(0).max(99),
  pomoCompleted: z.number().int().min(0).max(99),
  sortOrder: z.number(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export type TaskV1 = z.infer<typeof TaskV1Schema>
