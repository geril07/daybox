import { z } from 'zod'

export const CURRENT_VERSION = 3

export const envelopeV3Schema = z.object({
  version: z.literal(CURRENT_VERSION),
  exportedAt: z.string(),
  tasks: z.unknown(),
  groups: z.unknown(),
  timer: z.unknown(),
  planner: z.unknown(),
})

export const looseEnvelopeV3Schema = envelopeV3Schema.passthrough()

export type EnvelopeV3 = z.infer<typeof envelopeV3Schema>
