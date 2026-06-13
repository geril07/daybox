import type { GroupsSaveSliceCurrent } from '@/modules/groups/save/versions/v1'
import type { PlannerSaveSliceCurrent } from '@/modules/planner/save/versions/v1'
import type { TasksSaveSliceCurrent } from '@/modules/tasks/save/versions/v1'
import type { TimerSettingsSaveSliceCurrent } from '@/modules/timer/save/versions/v1'

import { SaveEnvelopeSchema, type SaveEnvelope } from './envelope'

export const CurrentSnapshotSchema = SaveEnvelopeSchema

export type CurrentSnapshot = SaveEnvelope & {
  envelopeVersion: 1
  slices: {
    groups: GroupsSaveSliceCurrent
    tasks: TasksSaveSliceCurrent
    timerSettings: TimerSettingsSaveSliceCurrent
    planner: PlannerSaveSliceCurrent
  }
}

declare const preparedSnapshotBrand: unique symbol

export type PreparedSnapshot = CurrentSnapshot & {
  readonly [preparedSnapshotBrand]: true
}

export function markPrepared(snapshot: CurrentSnapshot): PreparedSnapshot {
  return snapshot as PreparedSnapshot
}
