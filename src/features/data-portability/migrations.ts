import { z } from 'zod'

import { PlannerStateSchema } from '@/features/planner'
import { TimerSettingsSchema } from '@/features/timer'
import { DEFAULT_TIMER_SETTINGS } from '@/features/timer'

import { readSnapshotVersion } from './version'
import { CURRENT_SNAPSHOT_VERSION } from './version'

const V2EnvelopeSchema = z.object({
  version: z.literal(2),
  exportedAt: z.string().optional(),
  tasks: z.array(z.unknown()),
  groups: z.array(z.unknown()),
  settings: z
    .object({
      timer: z.unknown().optional(),
      theme: z.unknown().optional(),
      weekStartDay: z.number().optional(),
    })
    .optional(),
})

const WeekStartDaySchema = PlannerStateSchema.shape.weekStartDay

export type MigrationResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string }

export function migrateToCurrentSnapshot(value: unknown): MigrationResult {
  const version = readSnapshotVersion(value)
  if (!version.ok) return version

  switch (version.version) {
    case CURRENT_SNAPSHOT_VERSION:
      return { ok: true, value }
    case 2:
      return { ok: true, value: migrateV2ToV3(value) }
    default: {
      const exhaustive: never = version.version
      return {
        ok: false,
        reason: `Unsupported snapshot version: ${exhaustive}`,
      }
    }
  }
}

export function migrateV2ToV3(v2: unknown): unknown {
  const parsed = V2EnvelopeSchema.safeParse(v2)
  if (!parsed.success) {
    return v2
  }
  const data = parsed.data
  const settings = data.settings ?? {}
  const timer = TimerSettingsSchema.safeParse(settings.timer).success
    ? settings.timer
    : DEFAULT_TIMER_SETTINGS
  const weekStartDay = WeekStartDaySchema.safeParse(settings.weekStartDay)
    .success
    ? settings.weekStartDay
    : 1
  const migrated = {
    version: CURRENT_SNAPSHOT_VERSION,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    tasks: data.tasks,
    groups: data.groups,
    timer,
    planner: { weekStartDay, browseDate: null },
  }
  return migrated
}
