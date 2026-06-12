import { CurrentSnapshotSchema, type CurrentSnapshot } from './schema'

export type ParseJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string }

export type ParseCurrentSnapshotResult =
  | { ok: true; snapshot: CurrentSnapshot }
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
  const result = CurrentSnapshotSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return { ok: false, reason: `Invalid snapshot at ${path}: ${message}` }
  }

  return { ok: true, snapshot: result.data }
}
