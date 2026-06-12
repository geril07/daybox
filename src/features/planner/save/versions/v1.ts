import { z } from 'zod'

import { PlannerStateV1Schema } from '../../schema/v1'

export const PlannerSaveSliceV1Schema = PlannerStateV1Schema.extend({
  version: z.literal(1),
})

export type PlannerSaveSliceV1 = z.infer<typeof PlannerSaveSliceV1Schema>
export type PlannerSaveSliceCurrent = PlannerSaveSliceV1
