import { z } from 'zod'

import { TaskV1Schema } from './v1'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const TaskV2Schema = TaskV1Schema.extend({
  seriesId: z.string().min(1).nullable().default(null),
  occurrenceDate: DateSchema.nullable().default(null),
}).refine(
  (task) => (task.seriesId === null) === (task.occurrenceDate === null),
  { message: 'Recurrence identity must have both seriesId and occurrenceDate' },
)

export const SeriesSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(280),
  groupId: z.string().min(1),
  pomoEstimate: z.number().min(0).max(99),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((days) => new Set(days).size === days.length, 'Duplicate weekdays'),
  active: z.boolean(),
  skipDates: z
    .array(DateSchema)
    .refine(
      (dates) => new Set(dates).size === dates.length,
      'Duplicate skip dates',
    ),
  sortOrder: z.number(),
  createdAt: z.string().datetime(),
})

export const TaskStateSchema = z
  .object({
    tasks: z.array(TaskV2Schema),
    series: z.array(SeriesSchema).default([]),
  })
  .refine(
    (state) => {
      const identities = state.tasks
        .filter((task) => task.seriesId !== null)
        .map((task) => JSON.stringify([task.seriesId, task.occurrenceDate]))
      return new Set(identities).size === identities.length
    },
    { message: 'Duplicate occurrence identity' },
  )
