import { DEFAULT_GROUP_ID, GROUP_COLORS, type Group } from '@/modules/groups'

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

function createDefaultGroup(): Group {
  return {
    id: DEFAULT_GROUP_ID,
    name: 'General',
    color: GROUP_COLORS[0],
    createdAt: new Date().toISOString(),
  }
}

export function normalizeCrossSliceInvariants(
  snapshot: CurrentSnapshot,
): NormalizeSnapshotResult {
  const warnings: string[] = []
  const aggregateError = validateAggregateIds(snapshot)
  if (aggregateError) return { ok: false, reason: aggregateError }

  const hasDefaultGroup = snapshot.slices.groups.groups.some(
    (g) => g.id === DEFAULT_GROUP_ID,
  )
  const groups = hasDefaultGroup
    ? snapshot.slices.groups.groups
    : [createDefaultGroup(), ...snapshot.slices.groups.groups]

  if (!hasDefaultGroup) {
    warnings.push('Default group was missing. It has been restored.')
  }

  const groupIds = new Set(groups.map((g) => g.id))
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

  const prepared = markPrepared({
    ...snapshot,
    slices: {
      ...snapshot.slices,
      groups: { ...snapshot.slices.groups, groups },
      tasks: { ...snapshot.slices.tasks, tasks },
    },
  })
  return warnings.length > 0
    ? { ok: true, snapshot: prepared, warnings }
    : { ok: true, snapshot: prepared }
}

function validateAggregateIds(snapshot: CurrentSnapshot): string | null {
  const taskIds = new Map<string, number>()
  for (const [index, task] of snapshot.slices.tasks.tasks.entries()) {
    const firstIndex = taskIds.get(task.id)
    if (firstIndex !== undefined) {
      return `Invalid snapshot at tasks.${index}.id: Duplicate task id "${task.id}" also appears at tasks.${firstIndex}.id`
    }
    taskIds.set(task.id, index)
  }

  const groupIds = new Map<string, number>()
  let defaultGroupCount = 0
  for (const [index, group] of snapshot.slices.groups.groups.entries()) {
    if (group.id === DEFAULT_GROUP_ID) defaultGroupCount += 1

    const firstIndex = groupIds.get(group.id)
    if (firstIndex !== undefined) {
      return `Invalid snapshot at groups.${index}.id: Duplicate group id "${group.id}" also appears at groups.${firstIndex}.id`
    }
    groupIds.set(group.id, index)
  }

  if (defaultGroupCount > 1)
    return 'Invalid snapshot at groups: Duplicate default group.'

  return null
}
