import { looseEnvelopeV3Schema } from './envelope'
import { migrateV2ToV3 } from './migrations'

export type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string }

export function validateSnapshot(json: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'Corrupted file. Could not parse JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }
  const obj = parsed as Record<string, unknown>
  const version = obj.version
  if (version !== 2 && version !== 3) {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }
  const candidate = version === 2 ? migrateV2ToV3(obj) : obj
  const result = looseEnvelopeV3Schema.safeParse(candidate)
  if (!result.success) {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }
  return { ok: true, data: result.data as Record<string, unknown> }
}
