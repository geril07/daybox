import { z } from 'zod'

export const TimerSettingsSaveV1Schema = z.object({
  focusDuration: z.number().int().min(1).max(180),
  shortBreakDuration: z.number().int().min(1).max(60),
  longBreakDuration: z.number().int().min(1).max(120),
  longBreakInterval: z.number().int().min(1).max(20),
  autoStartBreaks: z.boolean(),
  autoStartPomodoros: z.boolean(),
  notificationsEnabled: z.boolean().default(true),
  alarmSound: z.enum(['bell', 'digital', 'gentle', 'ping']),
  alarmVolume: z.number().min(0).max(1),
  alarmRepeat: z.number().int().min(0).max(20),
})

export const TimerSettingsSaveSliceV1Schema = z.object({
  version: z.literal(1),
  settings: TimerSettingsSaveV1Schema,
})

export type TimerSettingsSaveSliceV1 = z.infer<
  typeof TimerSettingsSaveSliceV1Schema
>
export type TimerSettingsSaveSliceCurrent = TimerSettingsSaveSliceV1
