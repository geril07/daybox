import { groupsSaveSlice } from '@/modules/groups'
import { plannerSaveSlice } from '@/modules/planner'
import { tasksSaveSlice } from '@/modules/tasks'
import { timerSettingsSaveSlice } from '@/modules/timer'
import type { InferSaveSliceCurrent } from '@/shared/save-slice'

export const saveSlices = [
  groupsSaveSlice,
  tasksSaveSlice,
  timerSettingsSaveSlice,
  plannerSaveSlice,
] as const

export type SaveSliceName = (typeof saveSlices)[number]['name']
export type SaveSliceExportSlice = {
  [K in (typeof saveSlices)[number] as K['name']]: InferSaveSliceCurrent<K>
}

export type AnySaveSlice = (typeof saveSlices)[number]
