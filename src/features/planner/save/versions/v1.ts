import { z } from 'zod'

export const PlannerSaveSliceV1Schema = z.object({
  version: z.literal(1),
  weekStartDay: z.number().int().min(0).max(6),
  browseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})

export type PlannerSaveSliceV1 = z.infer<typeof PlannerSaveSliceV1Schema>
export type PlannerSaveSliceCurrent = PlannerSaveSliceV1
