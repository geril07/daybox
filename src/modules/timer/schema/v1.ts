import { z } from 'zod'

export const TimerPhaseV1Schema = z.enum(['focus', 'shortBreak', 'longBreak'])

export const TimerSettingsV1Schema = z.object({
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

export const TimerStateV1Schema = z.object({
  phase: TimerPhaseV1Schema,
  startedAt: z.number().nullable(),
  elapsed: z.number().min(0),
  sessionPomoCount: z.number().int().min(0),
  isRunning: z.boolean(),
  focusedTaskId: z.string().nullable(),
  intervalDurationMin: z
    .number()
    .int()
    .min(1)
    .max(180)
    .nullable()
    .default(null),
  settings: TimerSettingsV1Schema,
})

export type TimerPhaseV1 = z.infer<typeof TimerPhaseV1Schema>
export type TimerSettingsV1 = z.infer<typeof TimerSettingsV1Schema>
