import { groupsSaveSlice } from '@/modules/groups'
import { historySaveSlice } from '@/modules/history'
import { plannerSaveSlice } from '@/modules/planner'
import { tasksSaveSlice } from '@/modules/tasks'
import { timerSettingsSaveSlice } from '@/modules/timer'
import type { InferSaveSliceCurrent } from '@/shared/save-slice'

export const saveSlices = [
  groupsSaveSlice,
  tasksSaveSlice,
  timerSettingsSaveSlice,
  plannerSaveSlice,
  historySaveSlice,
] as const

export type SaveSliceName = (typeof saveSlices)[number]['name']

export const knownSliceNames = new Set<string>(saveSlices.map((s) => s.name))

type GroupsTCurrent = InferSaveSliceCurrent<typeof groupsSaveSlice>
type TasksTCurrent = InferSaveSliceCurrent<typeof tasksSaveSlice>
type TimerSettingsTCurrent = InferSaveSliceCurrent<
  typeof timerSettingsSaveSlice
>
type PlannerTCurrent = InferSaveSliceCurrent<typeof plannerSaveSlice>
type HistoryTCurrent = InferSaveSliceCurrent<typeof historySaveSlice>

declare module '@/shared/save-slice/map' {
  interface SaveSliceMap {
    groups: GroupsTCurrent
    tasks: TasksTCurrent
    timerSettings: TimerSettingsTCurrent
    planner: PlannerTCurrent
    history: HistoryTCurrent
  }
}

export type AnySaveSlice = (typeof saveSlices)[number]
