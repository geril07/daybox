import { z } from 'zod'

import { TaskV1Schema } from '../../schema/v1'

export const TaskSaveV1Schema = TaskV1Schema

export const TasksSaveSliceV1Schema = z.object({
  version: z.literal(1),
  tasks: z.array(TaskSaveV1Schema),
})

export type TasksSaveSliceV1 = z.infer<typeof TasksSaveSliceV1Schema>
export type TasksSaveSliceCurrent = TasksSaveSliceV1
