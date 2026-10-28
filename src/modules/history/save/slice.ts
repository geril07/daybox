import type { SaveSlice } from '@/shared/save-slice'
import { detectDuplicateId, parseSliceInput } from '@/shared/utils/save-helpers'

import { useHistoryStore } from '../store'
import {
  HistorySaveSliceV1Schema,
  type HistorySaveSliceCurrent,
} from './versions/v1'

function parseHistorySlice(
  input: unknown,
): ReturnType<SaveSlice<'history', HistorySaveSliceCurrent>['prepareImport']> {
  const result = parseSliceInput('history', HistorySaveSliceV1Schema, input)
  if (!result.ok) return result

  const duplicateError = detectDuplicateId(
    result.value.events,
    (event) => event.id,
    'event',
    'history.events',
  )
  if (duplicateError) return { ok: false, reason: duplicateError }

  return result
}

export const historySaveSlice: SaveSlice<'history', HistorySaveSliceCurrent> = {
  name: 'history',
  currentVersion: 1,
  missing: { kind: 'useDefault', defaultValue: { version: 1, events: [] } },

  exportSlice: () => ({
    version: 1,
    events: useHistoryStore.getState().events,
  }),

  validateExport: parseHistorySlice,

  prepareImport: parseHistorySlice,

  applyImport: (value) => {
    useHistoryStore.setState({ events: value.events })
  },
}
