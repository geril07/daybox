import type { z } from 'zod'

import type { TimerPhaseSchema, TimerSettingsSchema } from './schema'

export type TimerPhase = z.infer<typeof TimerPhaseSchema>
export type TimerSettings = z.infer<typeof TimerSettingsSchema>
