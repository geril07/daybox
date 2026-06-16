import { z } from 'zod'

import type { PrepareResult } from '@/shared/save-slice'

import { knownSliceNames } from './registry'

export const CURRENT_SAVE_ENVELOPE_VERSION = 1

export const SaveEnvelopeSchema = z.object({
  envelopeVersion: z.literal(CURRENT_SAVE_ENVELOPE_VERSION),
  exportedAt: z.string(),
  slices: z.record(z.string(), z.unknown()),
})

export type SaveEnvelope = z.infer<typeof SaveEnvelopeSchema>

export function parseSaveEnvelope(value: unknown): PrepareResult<SaveEnvelope> {
  const result = SaveEnvelopeSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return { ok: false, reason: `envelope.${path}: ${message}` }
  }

  for (const key of Object.keys(result.data.slices)) {
    if (!knownSliceNames.has(key)) {
      return {
        ok: false,
        reason: `envelope.slices.${key}: Unknown slice — not a registered feature`,
      }
    }
  }

  return { ok: true, value: result.data }
}
