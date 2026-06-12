export const CURRENT_SNAPSHOT_VERSION = 3

export const CURRENT_VERSION = CURRENT_SNAPSHOT_VERSION

export const SUPPORTED_SNAPSHOT_VERSIONS = [2, 3] as const

export type SnapshotVersion = (typeof SUPPORTED_SNAPSHOT_VERSIONS)[number]

export type SnapshotVersionResult =
  | { ok: true; version: SnapshotVersion }
  | { ok: false; reason: string }

export function readSnapshotVersion(value: unknown): SnapshotVersionResult {
  if (!value || typeof value !== 'object') {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }

  const version = (value as Record<string, unknown>).version
  if (!SUPPORTED_SNAPSHOT_VERSIONS.includes(version as SnapshotVersion)) {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }

  return { ok: true, version: version as SnapshotVersion }
}
