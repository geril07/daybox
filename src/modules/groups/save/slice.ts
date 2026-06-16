import type { SaveSlice } from '@/shared/save-slice'
import { detectDuplicateId, parseSliceInput } from '@/shared/utils/save-helpers'

import { GROUP_COLORS } from '../constants'
import { DEFAULT_GROUP_ID, useGroupStore } from '../store'
import type { Group } from '../types'
import {
  GroupsSaveSliceV1Schema,
  type GroupsSaveSliceCurrent,
} from './versions/v1'

function createDefaultGroup(): Group {
  return {
    id: DEFAULT_GROUP_ID,
    name: 'General',
    color: GROUP_COLORS[0],
    createdAt: new Date().toISOString(),
  }
}

function parseGroupsSlice(
  input: unknown,
): ReturnType<SaveSlice<'groups', GroupsSaveSliceCurrent>['prepareImport']> {
  const result = parseSliceInput('groups', GroupsSaveSliceV1Schema, input)
  if (!result.ok) return result

  const parsed = result.value

  const duplicateError = detectDuplicateId(
    parsed.groups,
    (g) => g.id,
    'group',
    'groups',
  )
  if (duplicateError) {
    return { ok: false, reason: duplicateError }
  }

  let defaultGroupCount = 0
  for (const group of parsed.groups) {
    if (group.id === DEFAULT_GROUP_ID) defaultGroupCount += 1
  }

  if (defaultGroupCount > 1) {
    return {
      ok: false,
      reason: 'groups: Duplicate default group.',
    }
  }

  const hasDefaultGroup = defaultGroupCount === 1
  if (hasDefaultGroup) {
    return { ok: true, value: parsed }
  }

  return {
    ok: true,
    value: {
      ...parsed,
      groups: [createDefaultGroup(), ...parsed.groups],
    },
    warnings: ['Default group was missing. It has been restored.'],
  }
}

export const groupsSaveSlice: SaveSlice<'groups', GroupsSaveSliceCurrent> = {
  name: 'groups',
  currentVersion: 1,
  missing: { kind: 'required' },

  exportSlice: () => ({
    version: 1,
    groups: useGroupStore.getState().groups,
  }),

  validateExport: (value) =>
    parseSliceInput('groups', GroupsSaveSliceV1Schema, value),

  prepareImport: parseGroupsSlice,

  applyImport: (value) => {
    useGroupStore.setState({
      groups: value.groups as Group[],
      stickyGroupId: null,
    })
  },
}
