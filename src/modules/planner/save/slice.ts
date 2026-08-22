import type { SaveSlice } from '@/shared/save-slice'
import { parseSliceInput } from '@/shared/utils/save-helpers'

import { usePlannerStore, type WeekStartDay } from '../store'
import { PlannerSaveSliceV1Schema } from './versions/v1'
import {
  PlannerSaveSliceV2Schema,
  type PlannerSaveSliceCurrent,
} from './versions/v2'

export const plannerSaveSlice: SaveSlice<'planner', PlannerSaveSliceCurrent> = {
  name: 'planner',
  currentVersion: 2,
  missing: {
    kind: 'useDefault',
    defaultValue: {
      version: 2,
      weekStartDay: 1,
      browseDate: null,
      dayStartMinutes: 0,
    },
  },

  exportSlice: () => {
    const planner = usePlannerStore.getState()
    return {
      version: 2,
      weekStartDay: planner.weekStartDay,
      browseDate: planner.browseDate,
      dayStartMinutes: planner.dayStartMinutes,
    }
  },

  validateExport: (value) =>
    parseSliceInput('planner', PlannerSaveSliceV2Schema, value),

  migrateFrom: {
    1: (input) => {
      const result = parseSliceInput('planner', PlannerSaveSliceV1Schema, input)
      if (!result.ok) return result
      return {
        ok: true,
        value: { ...result.value, version: 2, dayStartMinutes: 0 },
      }
    },
  },

  prepareImport: (input) =>
    parseSliceInput('planner', PlannerSaveSliceV2Schema, input),

  applyImport: (value) => {
    usePlannerStore
      .getState()
      .setWeekStartDay(value.weekStartDay as WeekStartDay)
    usePlannerStore.getState().setBrowseDate(value.browseDate)
    usePlannerStore.getState().setDayStartMinutes(value.dayStartMinutes)
  },
}
