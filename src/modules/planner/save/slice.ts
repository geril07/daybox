import type { SaveSlice } from '@/shared/save-slice'
import { parseSliceInput } from '@/shared/utils/save-helpers'

import { usePlannerStore, type WeekStartDay } from '../store'
import {
  PlannerSaveSliceV1Schema,
  type PlannerSaveSliceCurrent,
} from './versions/v1'

export const plannerSaveSlice: SaveSlice<'planner', PlannerSaveSliceCurrent> = {
  name: 'planner',
  currentVersion: 1,
  missing: {
    kind: 'useDefault',
    defaultValue: { version: 1, weekStartDay: 1, browseDate: null },
  },

  exportSlice: () => {
    const planner = usePlannerStore.getState()
    return {
      version: 1,
      weekStartDay: planner.weekStartDay,
      browseDate: planner.browseDate,
    }
  },

  validateExport: (value) =>
    parseSliceInput('planner', PlannerSaveSliceV1Schema, value),

  prepareImport: (input) =>
    parseSliceInput('planner', PlannerSaveSliceV1Schema, input),

  applyImport: (value) => {
    usePlannerStore
      .getState()
      .setWeekStartDay(value.weekStartDay as WeekStartDay)
    usePlannerStore.getState().setBrowseDate(value.browseDate)
  },
}
