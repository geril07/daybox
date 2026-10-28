import { z } from 'zod'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const UtcOffsetMinutesSchema = z.number().int().min(-840).max(840)

const EventBaseV1Schema = z.object({
  id: z.string().min(1),
  at: z.string().datetime(),
  utcOffsetMinutes: UtcOffsetMinutesSchema,
})

export const HistoryEventV1Schema = z.discriminatedUnion('type', [
  EventBaseV1Schema.extend({
    type: z.literal('task.rescheduled'),
    taskId: z.string().min(1),
    from: DateSchema.nullable(),
    to: DateSchema.nullable(),
  }),
  EventBaseV1Schema.extend({
    type: z.literal('task.completed'),
    taskId: z.string().min(1),
    title: z.string(),
    groupId: z.string().min(1),
    groupName: z.string().nullable(),
    date: DateSchema.nullable(),
  }),
  EventBaseV1Schema.extend({
    type: z.literal('task.uncompleted'),
    taskId: z.string().min(1),
  }),
  EventBaseV1Schema.extend({
    type: z.literal('task.deleted'),
    taskId: z.string().min(1),
    title: z.string(),
    groupId: z.string().min(1),
    groupName: z.string().nullable(),
    completed: z.boolean(),
  }),
  EventBaseV1Schema.extend({
    type: z.literal('focus.ended'),
    taskId: z.string().min(1).nullable(),
    groupId: z.string().min(1).nullable(),
    groupName: z.string().nullable(),
    outcome: z.enum(['completed', 'skipped', 'abandoned']),
    plannedMs: z.number().int().min(0),
    focusedMs: z.number().int().min(0),
  }),
])

export const HistoryStateV1Schema = z.object({
  trackingStartedAt: z.string().datetime(),
  trackingUtcOffsetMinutes: UtcOffsetMinutesSchema,
  events: z.array(HistoryEventV1Schema),
})
