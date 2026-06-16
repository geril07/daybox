import type { PrepareResult } from '@/shared/save-slice'

import { CURRENT_SAVE_ENVELOPE_VERSION, SaveEnvelopeSchema } from './envelope'
import { saveSlices } from './registry'
import type { CurrentSnapshot } from './schema'

export function buildSnapshot(): PrepareResult<CurrentSnapshot> {
  const slices: Record<string, unknown> = {}
  for (const slice of saveSlices) {
    const exported = slice.exportSlice()
    if (slice.validateExport) {
      const validation = slice.validateExport(exported)
      if (!validation.ok) return validation
    }
    slices[slice.name] = exported
  }

  const snapshot = {
    envelopeVersion: CURRENT_SAVE_ENVELOPE_VERSION,
    exportedAt: new Date().toISOString(),
    slices,
  }

  const envelopeResult = SaveEnvelopeSchema.safeParse(snapshot)
  if (!envelopeResult.success) {
    const issue = envelopeResult.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `envelope.${path}: ${message}`,
    }
  }

  return { ok: true, value: snapshot as CurrentSnapshot }
}
