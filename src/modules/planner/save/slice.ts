import type { SaveSlice } from '@/shared/save-slice'

import { usePlannerStore, type WeekStartDay } from '../store'
import {
  PlannerSaveSliceV1Schema,
  type PlannerSaveSliceCurrent,
} from './versions/v1'

type PlannerPrepareResult = ReturnType<
  SaveSlice<'planner', PlannerSaveSliceCurrent>['prepareImport']
>

function parsePlannerSlice(input: unknown): PlannerPrepareResult {
  const result = PlannerSaveSliceV1Schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `Invalid snapshot at planner.${path}: ${message}`,
    }
  }

  return { ok: true, value: result.data }
}

export const plannerSaveSlice: SaveSlice<'planner', PlannerSaveSliceCurrent> = {
  name: 'planner',
  currentVersion: 1,
  missing: {
    kind: 'useDefault',
    getDefault: () => ({ version: 1, weekStartDay: 1, browseDate: null }),
  },

  exportSlice: () => {
    const planner = usePlannerStore.getState()
    return {
      version: 1,
      weekStartDay: planner.weekStartDay,
      browseDate: planner.browseDate,
    }
  },

  prepareImport: parsePlannerSlice,

  applyImport: (value) => {
    usePlannerStore
      .getState()
      .setWeekStartDay(value.weekStartDay as WeekStartDay)
    usePlannerStore.getState().setBrowseDate(value.browseDate)
  },
}
