import { parseSaveEnvelope, type SaveEnvelope } from './envelope'
import { saveSlices } from './registry'
import type { CurrentSnapshot, PreparedSnapshot } from './schema'

type ParseJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string }

function parseJson(json: string): ParseJsonResult {
  try {
    return { ok: true, value: JSON.parse(json) as unknown }
  } catch {
    return { ok: false, reason: 'Corrupted file. Could not parse JSON.' }
  }
}

export type PreparedSnapshotImportResult =
  | { ok: true; snapshot: PreparedSnapshot; warnings?: string[] }
  | { ok: false; reason: string }

export type CommitSnapshotImportResult =
  | { ok: true }
  | { ok: false; reason: string; committed: string[] }

export function prepareSnapshotImport(
  json: string,
): PreparedSnapshotImportResult {
  const parsed = parseJson(json)
  if (!parsed.ok) return parsed

  const envelope = parseSaveEnvelope(parsed.value)
  if (!envelope.ok) return envelope

  const prepared = prepareSlices(envelope.value)
  if (!prepared.ok) return prepared

  const postResult = runPostPrepare(prepared.snapshot)
  if (!postResult.ok) return postResult

  const warnings = [
    ...(prepared.warnings ?? []),
    ...(postResult.warnings ?? []),
  ]
  return warnings.length > 0
    ? { ok: true, snapshot: postResult.snapshot, warnings }
    : { ok: true, snapshot: postResult.snapshot }
}

export function commitSnapshotImport(
  snapshot: PreparedSnapshot,
): CommitSnapshotImportResult {
  const committed: string[] = []
  for (const slice of saveSlices) {
    try {
      slice.applyImport(snapshot.slices[slice.name] as never)
      committed.push(slice.name)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return {
        ok: false,
        reason: `Failed to commit slice "${slice.name}": ${message}`,
        committed,
      }
    }
  }

  return { ok: true }
}

type PrepareSlicesResult =
  | { ok: true; snapshot: CurrentSnapshot; warnings?: string[] }
  | { ok: false; reason: string }

function prepareSlices(envelope: SaveEnvelope): PrepareSlicesResult {
  const preparedSlices: Record<string, unknown> = {}
  const warnings: string[] = []

  for (const slice of saveSlices) {
    const hasSlice = Object.hasOwn(envelope.slices, slice.name)
    const input = hasSlice
      ? envelope.slices[slice.name]
      : getMissingSliceInput(slice)

    if (input === undefined) {
      return {
        ok: false,
        reason: `${slice.name}: Required`,
      }
    }

    const migrated = prepareSlice(slice, input)
    if (!migrated.ok) return migrated

    const prepared = slice.prepareImport(migrated.value)
    if (!prepared.ok) return prepared

    preparedSlices[slice.name] = prepared.value
    if (prepared.warnings) warnings.push(...prepared.warnings)
  }

  const snapshot = {
    envelopeVersion: envelope.envelopeVersion,
    exportedAt: envelope.exportedAt,
    slices: preparedSlices,
  } as CurrentSnapshot

  return warnings.length > 0
    ? { ok: true, snapshot, warnings }
    : { ok: true, snapshot }
}

function prepareSlice(
  slice: (typeof saveSlices)[number],
  input: unknown,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (!slice.migrateFrom) return { ok: true, value: input }

  let version = extractVersion(input)
  let current = input

  while (typeof version === 'number' && version < slice.currentVersion) {
    const migration = slice.migrateFrom[version]
    if (!migration) {
      return {
        ok: false,
        reason: `${slice.name}: No migration from version ${version}. Current version is ${slice.currentVersion}.`,
      }
    }
    const result = migration(current)
    if (!result.ok) return result

    current = result.value
    version = extractVersion(current)
  }

  return { ok: true, value: current }
}

function extractVersion(input: unknown): unknown {
  if (typeof input === 'object' && input !== null && 'version' in input) {
    return (input as Record<string, unknown>).version
  }
  return undefined
}

type PostPrepareResult =
  | { ok: true; snapshot: PreparedSnapshot; warnings?: string[] }
  | { ok: false; reason: string }

function runPostPrepare(snapshot: CurrentSnapshot): PostPrepareResult {
  let current = { ...snapshot, slices: { ...snapshot.slices } }
  const warnings: string[] = []

  for (const slice of saveSlices) {
    if (!slice.postPrepare) continue

    const sliceData = current.slices[slice.name] as never
    const result = slice.postPrepare(sliceData, current.slices as never)
    if (!result.ok) return result

    current = {
      ...current,
      slices: { ...current.slices, [slice.name]: result.value },
    }
    if (result.warnings) warnings.push(...result.warnings)
  }

  return { ok: true, snapshot: current as PreparedSnapshot, warnings }
}

function getMissingSliceInput(
  slice: (typeof saveSlices)[number],
): unknown | undefined {
  if (slice.missing.kind === 'required') return undefined
  return slice.missing.defaultValue
}
