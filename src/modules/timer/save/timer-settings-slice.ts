import type { SaveSlice } from '@/shared/save-slice'
import { parseSliceInput } from '@/shared/utils/save-helpers'

import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '../store'
import type { TimerSettings } from '../types'
import {
  TimerSettingsSaveSliceV1Schema,
  type TimerSettingsSaveSliceCurrent,
} from './versions/v1'

export const timerSettingsSaveSlice: SaveSlice<
  'timerSettings',
  TimerSettingsSaveSliceCurrent
> = {
  name: 'timerSettings',
  currentVersion: 1,
  missing: {
    kind: 'useDefault',
    defaultValue: { version: 1, settings: DEFAULT_TIMER_SETTINGS },
  },

  exportSlice: () => ({
    version: 1,
    settings: useTimerStore.getState().settings,
  }),

  validateExport: (value) =>
    parseSliceInput('timerSettings', TimerSettingsSaveSliceV1Schema, value),

  prepareImport: (input) =>
    parseSliceInput('timerSettings', TimerSettingsSaveSliceV1Schema, input),

  applyImport: (value) => {
    useTimerStore.getState().setTimerSettings(value.settings as TimerSettings)
    useTimerStore.getState().setFocusedTaskId(null)
  },
}
