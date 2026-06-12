import { z } from 'zod'

import { CURRENT_SAVE_ENVELOPE_VERSION, type SaveEnvelope } from './envelope'

const LegacyV2SnapshotSchema = z.object({
  version: z.literal(2),
  exportedAt: z.string().optional(),
  tasks: z.array(z.unknown()),
  groups: z.array(z.unknown()),
  settings: z
    .object({
      timer: z.unknown().optional(),
      theme: z.unknown().optional(),
      weekStartDay: z.unknown().optional(),
    })
    .optional(),
})

const LegacyV3SnapshotSchema = z.object({
  version: z.literal(3),
  exportedAt: z.string().optional(),
  tasks: z.array(z.unknown()),
  groups: z.array(z.unknown()),
  timer: z.unknown(),
  planner: z.unknown(),
})

export type LegacyAdapterResult =
  | { ok: true; envelope: SaveEnvelope }
  | { ok: false; reason: string }

export function adaptLegacySnapshot(value: unknown): LegacyAdapterResult {
  const version = readLegacyVersion(value)
  if (!version.ok) return version

  if (version.version === 2) return adaptV2Snapshot(value)
  return adaptV3Snapshot(value)
}

function readLegacyVersion(
  value: unknown,
): { ok: true; version: 2 | 3 } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }

  const version = (value as Record<string, unknown>).version
  if (version !== 2 && version !== 3) {
    return { ok: false, reason: 'Not a DayBox export file.' }
  }

  return { ok: true, version }
}

function adaptV2Snapshot(value: unknown): LegacyAdapterResult {
  const result = LegacyV2SnapshotSchema.safeParse(value)
  if (!result.success) {
    return { ok: false, reason: formatLegacyIssue(result.error, 'legacy') }
  }

  const snapshot = result.data
  const settings = snapshot.settings ?? {}
  const slices: Record<string, unknown> = {
    groups: { version: 1, groups: snapshot.groups },
    tasks: { version: 1, tasks: snapshot.tasks },
    planner: {
      version: 1,
      weekStartDay: settings.weekStartDay ?? 1,
      browseDate: null,
    },
  }

  if (settings.timer !== undefined) {
    slices.timerSettings = { version: 1, settings: settings.timer }
  }

  return {
    ok: true,
    envelope: {
      envelopeVersion: CURRENT_SAVE_ENVELOPE_VERSION,
      exportedAt: snapshot.exportedAt ?? new Date().toISOString(),
      slices,
    },
  }
}

function adaptV3Snapshot(value: unknown): LegacyAdapterResult {
  const result = LegacyV3SnapshotSchema.safeParse(value)
  if (!result.success) {
    return { ok: false, reason: formatLegacyIssue(result.error, 'legacy') }
  }

  const snapshot = result.data
  return {
    ok: true,
    envelope: {
      envelopeVersion: CURRENT_SAVE_ENVELOPE_VERSION,
      exportedAt: snapshot.exportedAt ?? new Date().toISOString(),
      slices: {
        groups: { version: 1, groups: snapshot.groups },
        tasks: { version: 1, tasks: snapshot.tasks },
        timerSettings: { version: 1, settings: snapshot.timer },
        planner:
          snapshot.planner && typeof snapshot.planner === 'object'
            ? { version: 1, ...snapshot.planner }
            : snapshot.planner,
      },
    },
  }
}

function formatLegacyIssue(error: z.ZodError, prefix: string): string {
  const issue = error.issues[0]
  const path = issue?.path.join('.') || 'root'
  const message = issue?.message ?? 'Invalid value'
  return `Invalid snapshot at ${prefix}.${path}: ${message}`
}
