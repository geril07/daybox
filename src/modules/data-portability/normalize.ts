import { DEFAULT_GROUP_ID } from '@/modules/groups'

import {
  markPrepared,
  type CurrentSnapshot,
  type PreparedSnapshot,
} from './schema'

export type NormalizeSnapshotResult =
  | {
      ok: true
      snapshot: PreparedSnapshot
      warnings?: string[]
    }
  | { ok: false; reason: string }

export function normalizeCrossSliceInvariants(
  snapshot: CurrentSnapshot,
): NormalizeSnapshotResult {
  const warnings: string[] = []
  const groupIds = new Set(snapshot.slices.groups.groups.map((g) => g.id))
  const danglingGroupIds = new Set<string>()
  const tasks = snapshot.slices.tasks.tasks.map((task) => {
    if (groupIds.has(task.groupId)) return task
    danglingGroupIds.add(task.groupId)
    return { ...task, groupId: DEFAULT_GROUP_ID }
  })

  for (const groupId of danglingGroupIds) {
    warnings.push(
      `Task group "${groupId}" not found. Tasks reassigned to default group.`,
    )
  }

  if (tasks === snapshot.slices.tasks.tasks && warnings.length === 0) {
    return { ok: true, snapshot: markPrepared(snapshot) }
  }

  const prepared = markPrepared({
    ...snapshot,
    slices: {
      ...snapshot.slices,
      tasks: { ...snapshot.slices.tasks, tasks },
    },
  })
  return warnings.length > 0
    ? { ok: true, snapshot: prepared, warnings }
    : { ok: true, snapshot: prepared }
}
