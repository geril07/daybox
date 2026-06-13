import { z } from 'zod'

import { GroupV1Schema } from '../../schema/v1'

export const GroupSaveV1Schema = GroupV1Schema

export const GroupsSaveSliceV1Schema = z.object({
  version: z.literal(1),
  groups: z.array(GroupSaveV1Schema),
})

export type GroupsSaveSliceV1 = z.infer<typeof GroupsSaveSliceV1Schema>
export type GroupsSaveSliceCurrent = GroupsSaveSliceV1
