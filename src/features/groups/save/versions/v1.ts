import { z } from 'zod'

export const GroupSaveV1Schema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  color: z.string(),
  createdAt: z.string().datetime(),
})

export const GroupsSaveSliceV1Schema = z.object({
  version: z.literal(1),
  groups: z.array(GroupSaveV1Schema),
})

export type GroupsSaveSliceV1 = z.infer<typeof GroupsSaveSliceV1Schema>
export type GroupsSaveSliceCurrent = GroupsSaveSliceV1
