import { z } from 'zod'

import { TimerSettingsV1Schema } from '../../schema/v1'

export const TimerSettingsSaveV1Schema = TimerSettingsV1Schema

export const TimerSettingsSaveSliceV1Schema = z.object({
  version: z.literal(1),
  settings: TimerSettingsSaveV1Schema,
})

export type TimerSettingsSaveSliceV1 = z.infer<
  typeof TimerSettingsSaveSliceV1Schema
>
export type TimerSettingsSaveSliceCurrent = TimerSettingsSaveSliceV1
