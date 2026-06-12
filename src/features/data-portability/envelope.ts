import { z } from 'zod'

export const CURRENT_SAVE_ENVELOPE_VERSION = 1

export const SaveEnvelopeSchema = z.object({
  envelopeVersion: z.literal(CURRENT_SAVE_ENVELOPE_VERSION),
  exportedAt: z.string(),
  slices: z.record(z.string(), z.unknown()),
})

export type SaveEnvelope = z.infer<typeof SaveEnvelopeSchema>

export type ParseEnvelopeResult =
  | { ok: true; envelope: SaveEnvelope }
  | { ok: false; reason: string }

export function parseSaveEnvelope(value: unknown): ParseEnvelopeResult {
  const result = SaveEnvelopeSchema.safeParse(value)
  if (!result.success) {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }

  return { ok: true, envelope: result.data }
}
