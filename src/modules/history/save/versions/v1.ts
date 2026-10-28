import { z } from 'zod'

import { HistoryStateV1Schema } from '../../schema/v1'

export const HistorySaveSliceV1Schema = HistoryStateV1Schema.extend({
  version: z.literal(1),
})

export type HistorySaveSliceV1 = z.infer<typeof HistorySaveSliceV1Schema>
export type HistorySaveSliceCurrent = HistorySaveSliceV1
