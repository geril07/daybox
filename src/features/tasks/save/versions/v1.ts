import { z } from 'zod'

export const TaskSaveV1Schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(280),
  groupId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  pomoEstimate: z.number().int().min(0).max(99),
  pomoCompleted: z.number().int().min(0).max(99),
  sortOrder: z.number(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export const TasksSaveSliceV1Schema = z.object({
  version: z.literal(1),
  tasks: z.array(TaskSaveV1Schema),
})

export type TasksSaveSliceV1 = z.infer<typeof TasksSaveSliceV1Schema>
export type TasksSaveSliceCurrent = TasksSaveSliceV1
