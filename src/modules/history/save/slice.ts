import type { SaveSlice } from '@/shared/save-slice'
import { detectDuplicateId, parseSliceInput } from '@/shared/utils/save-helpers'

import { createEmptyHistory, useHistoryStore } from '../store'
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
  missing: {
    kind: 'useDefault',
    // A getter so a snapshot without history starts tracking at import time.
    get defaultValue() {
      return { version: 1 as const, ...createEmptyHistory() }
    },
  },

  exportSlice: () => {
    const { trackingStartedAt, trackingUtcOffsetMinutes, events } =
      useHistoryStore.getState()
    return { version: 1, trackingStartedAt, trackingUtcOffsetMinutes, events }
  },

  validateExport: parseHistorySlice,

  prepareImport: parseHistorySlice,

  applyImport: (value) => {
    useHistoryStore.setState({
      trackingStartedAt: value.trackingStartedAt,
      trackingUtcOffsetMinutes: value.trackingUtcOffsetMinutes,
      events: value.events,
    })
  },
}
