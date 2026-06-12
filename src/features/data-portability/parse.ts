import { SaveEnvelopeSchema, type SaveEnvelope } from './envelope'

export type ParseJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string }

export type ParseCurrentSnapshotResult =
  | { ok: true; snapshot: SaveEnvelope }
  | { ok: false; reason: string }

export function parseJson(json: string): ParseJsonResult {
  try {
    return { ok: true, value: JSON.parse(json) as unknown }
  } catch {
    return { ok: false, reason: 'Corrupted file. Could not parse JSON.' }
  }
}

export function parseCurrentSnapshot(
  value: unknown,
): ParseCurrentSnapshotResult {
  const result = SaveEnvelopeSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return { ok: false, reason: `Invalid snapshot at ${path}: ${message}` }
  }

  return { ok: true, snapshot: result.data }
}
