import { CURRENT_SAVE_ENVELOPE_VERSION } from './envelope'
import { saveSlices } from './registry'
import type { CurrentSnapshot } from './schema'

export function buildSnapshot(): CurrentSnapshot {
  const slices: Record<string, unknown> = {}
  for (const slice of saveSlices) {
    slices[slice.name] = slice.exportSlice()
  }

  return {
    envelopeVersion: CURRENT_SAVE_ENVELOPE_VERSION,
    exportedAt: new Date().toISOString(),
    slices,
  } as CurrentSnapshot
}
