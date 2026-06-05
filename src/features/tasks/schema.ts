import { z } from 'zod'

export const TaskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(280),
    groupId: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    pomoEstimate: z.number().int().min(0).max(9),
    pomoCompleted: z.number().int().min(0).max(9),
    sortOrder: z.number(),
    completed: z.boolean(),
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .refine((t) => t.pomoCompleted <= t.pomoEstimate, {
    message: 'pomoCompleted must be ≤ pomoEstimate',
  })
