import { useGroupStore } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore } from '@/features/tasks'
import { useTimerStore } from '@/features/timer'

import type { CurrentSnapshot } from './schema'
import { CURRENT_SNAPSHOT_VERSION } from './version'

export function buildSnapshot(): CurrentSnapshot {
  const planner = usePlannerStore.getState()
  return {
    version: CURRENT_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: useTaskStore.getState().tasks,
    groups: useGroupStore.getState().groups,
    timer: useTimerStore.getState().settings,
    planner: {
      weekStartDay: planner.weekStartDay,
      browseDate: planner.browseDate,
    },
  }
}
