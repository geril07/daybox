import { z } from 'zod'

import { DEFAULT_GROUP_ID, GroupSchema } from '@/features/groups'
import { PlannerStateSchema } from '@/features/planner'
import { TaskSchema } from '@/features/tasks'
import { TimerSettingsSchema } from '@/features/timer'

import { CURRENT_SNAPSHOT_VERSION } from './version'

export const CurrentSnapshotSchema = z
  .object({
    version: z.literal(CURRENT_SNAPSHOT_VERSION),
    exportedAt: z.string(),
    tasks: z.array(TaskSchema),
    groups: z.array(GroupSchema),
    timer: TimerSettingsSchema,
    planner: PlannerStateSchema,
  })
  .superRefine((snapshot, ctx) => {
    const taskIds = new Map<string, number>()
    snapshot.tasks.forEach((task, index) => {
      const firstIndex = taskIds.get(task.id)
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['tasks', index, 'id'],
          message: `Duplicate task id "${task.id}" also appears at tasks.${firstIndex}.id`,
        })
        return
      }
      taskIds.set(task.id, index)
    })

    const groupIds = new Map<string, number>()
    let defaultGroupCount = 0
    snapshot.groups.forEach((group, index) => {
      if (group.id === DEFAULT_GROUP_ID) defaultGroupCount += 1

      const firstIndex = groupIds.get(group.id)
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['groups', index, 'id'],
          message: `Duplicate group id "${group.id}" also appears at groups.${firstIndex}.id`,
        })
        return
      }
      groupIds.set(group.id, index)
    })

    if (defaultGroupCount > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['groups'],
        message: 'Duplicate default group.',
      })
    }
  })

export type CurrentSnapshot = z.infer<typeof CurrentSnapshotSchema>

declare const preparedSnapshotBrand: unique symbol

export type PreparedSnapshot = CurrentSnapshot & {
  readonly [preparedSnapshotBrand]: true
}

export function markPrepared(snapshot: CurrentSnapshot): PreparedSnapshot {
  return snapshot as PreparedSnapshot
}
