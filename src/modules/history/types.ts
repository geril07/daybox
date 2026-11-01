import type { z } from 'zod'

import type { HistoryEventSchema, TrackingStartSchema } from './schema'

export type HistoryEvent = z.infer<typeof HistoryEventSchema>
export type TrackingStart = z.infer<typeof TrackingStartSchema>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

export type HistoryEventInput = DistributiveOmit<
  HistoryEvent,
  'id' | 'at' | 'utcOffsetMinutes'
>
