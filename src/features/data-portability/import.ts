import { useGroupStore } from '@/features/groups'
import { usePlannerStore, type WeekStartDay } from '@/features/planner'
import { useTaskStore } from '@/features/tasks'
import { useTimerStore } from '@/features/timer'

import { migrateToCurrentSnapshot } from './migrations'
import { normalizeSnapshot } from './normalize'
import { parseCurrentSnapshot, parseJson } from './parse'
import type { PreparedSnapshot } from './schema'

export type PreparedSnapshotImportResult =
  | { ok: true; snapshot: PreparedSnapshot; warnings?: string[] }
  | { ok: false; reason: string }

export type CommitSnapshotImportResult = { ok: true }

export function prepareSnapshotImport(
  json: string,
): PreparedSnapshotImportResult {
  const parsed = parseJson(json)
  if (!parsed.ok) return parsed

  const migrated = migrateToCurrentSnapshot(parsed.value)
  if (!migrated.ok) return migrated

  const current = parseCurrentSnapshot(migrated.value)
  if (!current.ok) return current

  const normalized = normalizeSnapshot(current.snapshot)
  return normalized.warnings
    ? { ok: true, snapshot: normalized.snapshot, warnings: normalized.warnings }
    : { ok: true, snapshot: normalized.snapshot }
}

export function commitSnapshotImport(
  snapshot: PreparedSnapshot,
): CommitSnapshotImportResult {
  useGroupStore.setState({ groups: snapshot.groups, stickyGroupId: null })
  useTaskStore.setState({ tasks: snapshot.tasks })
  useTimerStore.getState().setTimerSettings(snapshot.timer)
  useTimerStore.getState().setFocusedTaskId(null)
  usePlannerStore
    .getState()
    .setWeekStartDay(snapshot.planner.weekStartDay as WeekStartDay)
  usePlannerStore.getState().setBrowseDate(snapshot.planner.browseDate)

  return { ok: true }
}
