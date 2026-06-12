import { parseSaveEnvelope, type SaveEnvelope } from './envelope'
import { adaptLegacySnapshot } from './legacy'
import { normalizeSnapshot } from './normalize'
import { parseJson } from './parse'
import { saveSlices } from './registry'
import type { CurrentSnapshot, PreparedSnapshot } from './schema'

export type PreparedSnapshotImportResult =
  | { ok: true; snapshot: PreparedSnapshot; warnings?: string[] }
  | { ok: false; reason: string }

export type CommitSnapshotImportResult = { ok: true }

export function prepareSnapshotImport(
  json: string,
): PreparedSnapshotImportResult {
  const parsed = parseJson(json)
  if (!parsed.ok) return parsed

  const envelope = readSaveEnvelope(parsed.value)
  if (!envelope.ok) return envelope

  const current = prepareSlices(envelope.envelope)
  if (!current.ok) return current

  const normalized = normalizeSnapshot(current.snapshot)
  if (!normalized.ok) return normalized

  const warnings = [...(current.warnings ?? []), ...(normalized.warnings ?? [])]
  return warnings.length > 0
    ? { ok: true, snapshot: normalized.snapshot, warnings }
    : { ok: true, snapshot: normalized.snapshot }
}

export function commitSnapshotImport(
  snapshot: PreparedSnapshot,
): CommitSnapshotImportResult {
  for (const slice of saveSlices) {
    slice.applyImport(snapshot.slices[slice.name])
  }

  return { ok: true }
}

type ReadSaveEnvelopeResult =
  | { ok: true; envelope: SaveEnvelope }
  | { ok: false; reason: string }

function readSaveEnvelope(value: unknown): ReadSaveEnvelopeResult {
  const current = parseSaveEnvelope(value)
  if (current.ok) return current

  return adaptLegacySnapshot(value)
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
        reason: `Invalid snapshot at slices.${slice.name}: Required`,
      }
    }

    const prepared = slice.prepareImport(input)
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

function getMissingSliceInput(
  slice: (typeof saveSlices)[number],
): unknown | undefined {
  if (slice.missing.kind === 'required') return undefined
  return slice.missing.getDefault()
}
