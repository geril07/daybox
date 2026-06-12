import { groupsSaveSlice } from '@/features/groups'
import { plannerSaveSlice } from '@/features/planner'
import { tasksSaveSlice } from '@/features/tasks'
import { timerSettingsSaveSlice } from '@/features/timer'

import type {
  MissingSliceStrategy,
  SaveSlice,
  SaveSlicePrepareResult,
} from './types'

export type RegisteredSaveSlice = {
  name: string
  currentVersion: number
  missing: MissingSliceStrategy<unknown>
  exportSlice: () => unknown
  prepareImport: (input: unknown) => SaveSlicePrepareResult<unknown>
  applyImport: (value: unknown) => void
}

function registerSlice<Name extends string, TCurrent>(
  slice: SaveSlice<Name, TCurrent>,
): RegisteredSaveSlice {
  return {
    name: slice.name,
    currentVersion: slice.currentVersion,
    missing: slice.missing,
    exportSlice: slice.exportSlice,
    prepareImport: slice.prepareImport,
    applyImport: (value) => slice.applyImport(value as TCurrent),
  }
}

export const saveSlices = [
  registerSlice(groupsSaveSlice),
  registerSlice(tasksSaveSlice),
  registerSlice(timerSettingsSaveSlice),
  registerSlice(plannerSaveSlice),
] as const
