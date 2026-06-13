import type { SaveSlice } from '@/shared/save-slice'

import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '../store'
import type { TimerSettings } from '../types'
import {
  TimerSettingsSaveSliceV1Schema,
  type TimerSettingsSaveSliceCurrent,
} from './versions/v1'

type TimerSettingsPrepareResult = ReturnType<
  SaveSlice<'timerSettings', TimerSettingsSaveSliceCurrent>['prepareImport']
>

function parseTimerSettingsSlice(input: unknown): TimerSettingsPrepareResult {
  const result = TimerSettingsSaveSliceV1Schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `Invalid snapshot at timerSettings.${path}: ${message}`,
    }
  }

  return { ok: true, value: result.data }
}

export const timerSettingsSaveSlice: SaveSlice<
  'timerSettings',
  TimerSettingsSaveSliceCurrent
> = {
  name: 'timerSettings',
  currentVersion: 1,
  missing: {
    kind: 'useDefault',
    getDefault: () => ({ version: 1, settings: DEFAULT_TIMER_SETTINGS }),
  },

  exportSlice: () => ({
    version: 1,
    settings: useTimerStore.getState().settings,
  }),

  prepareImport: parseTimerSettingsSlice,

  applyImport: (value) => {
    useTimerStore.getState().setTimerSettings(value.settings as TimerSettings)
    useTimerStore.getState().setFocusedTaskId(null)
  },
}
