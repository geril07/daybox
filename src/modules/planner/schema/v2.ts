import { z } from 'zod'

export const DayStartMinutesSchema = z.number().int().min(0).max(1439)

export const PlannerStateV2Schema = z.object({
  weekStartDay: z.number().int().min(0).max(6),
  browseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  dayStartMinutes: DayStartMinutesSchema.optional(),
})

export type PlannerStateV2 = z.infer<typeof PlannerStateV2Schema>
