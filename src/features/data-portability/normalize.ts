import { DEFAULT_GROUP_ID, GROUP_COLORS, type Group } from '@/features/groups'

import {
  markPrepared,
  type CurrentSnapshot,
  type PreparedSnapshot,
} from './schema'

export type NormalizeSnapshotResult = {
  snapshot: PreparedSnapshot
  warnings?: string[]
}

function createDefaultGroup(): Group {
  return {
    id: DEFAULT_GROUP_ID,
    name: 'General',
    color: GROUP_COLORS[0],
    createdAt: new Date().toISOString(),
  }
}

export function normalizeSnapshot(
  snapshot: CurrentSnapshot,
): NormalizeSnapshotResult {
  const warnings: string[] = []
  const hasDefaultGroup = snapshot.groups.some((g) => g.id === DEFAULT_GROUP_ID)
  const groups = hasDefaultGroup
    ? snapshot.groups
    : [createDefaultGroup(), ...snapshot.groups]

  if (!hasDefaultGroup) {
    warnings.push('Default group was missing. It has been restored.')
  }

  const groupIds = new Set(groups.map((g) => g.id))
  const danglingGroupIds = new Set<string>()
  const tasks = snapshot.tasks.map((task) => {
    if (groupIds.has(task.groupId)) return task
    danglingGroupIds.add(task.groupId)
    return { ...task, groupId: DEFAULT_GROUP_ID }
  })

  for (const groupId of danglingGroupIds) {
    warnings.push(
      `Task group "${groupId}" not found. Tasks reassigned to default group.`,
    )
  }

  const prepared = markPrepared({ ...snapshot, groups, tasks })
  return warnings.length > 0
    ? { snapshot: prepared, warnings }
    : { snapshot: prepared }
}
