import { z } from 'zod'

import { TaskStateSchema } from '../../schema/v2'

export const TasksSaveSliceV2Schema = TaskStateSchema.safeExtend({
  version: z.literal(2),
})
export type TasksSaveSliceCurrent = z.infer<typeof TasksSaveSliceV2Schema>
