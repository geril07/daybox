import { z } from 'zod'

import { PlannerStateV1Schema } from '../../schema/v1'
import { DayStartMinutesSchema } from '../../schema/v2'

export const PlannerSaveSliceV2Schema = PlannerStateV1Schema.extend({
  version: z.literal(2),
  dayStartMinutes: DayStartMinutesSchema,
})

export type PlannerSaveSliceV2 = z.infer<typeof PlannerSaveSliceV2Schema>
export type PlannerSaveSliceCurrent = PlannerSaveSliceV2
