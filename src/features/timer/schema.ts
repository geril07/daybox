import { z } from 'zod'

export const TimerPhaseSchema = z.enum(['focus', 'shortBreak', 'longBreak'])

export const TimerSettingsSchema = z.object({
  focusDuration: z.number().int().min(1).max(180),
  shortBreakDuration: z.number().int().min(1).max(60),
  longBreakDuration: z.number().int().min(1).max(120),
  longBreakInterval: z.number().int().min(1).max(20),
  autoStartBreaks: z.boolean(),
  autoStartPomodoros: z.boolean(),
  alarmSound: z.enum(['bell', 'digital', 'gentle', 'ping']),
  alarmVolume: z.number().min(0).max(1),
  alarmRepeat: z.number().int().min(0).max(20),
})

export const TimerStateSchema = z.object({
  phase: TimerPhaseSchema,
  startedAt: z.number().nullable(),
  elapsed: z.number().min(0),
  sessionPomoCount: z.number().int().min(0),
  isRunning: z.boolean(),
  focusedTaskId: z.string().nullable(),
  settings: TimerSettingsSchema,
})
