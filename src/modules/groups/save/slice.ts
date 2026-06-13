import type { SaveSlice } from '@/shared/save-slice'

import { GROUP_COLORS } from '../constants'
import { DEFAULT_GROUP_ID, useGroupStore } from '../store'
import type { Group } from '../types'
import {
  GroupsSaveSliceV1Schema,
  type GroupsSaveSliceCurrent,
} from './versions/v1'

type GroupsPrepareResult = ReturnType<
  SaveSlice<'groups', GroupsSaveSliceCurrent>['prepareImport']
>

function createDefaultGroup(): Group {
  return {
    id: DEFAULT_GROUP_ID,
    name: 'General',
    color: GROUP_COLORS[0],
    createdAt: new Date().toISOString(),
  }
}

function parseGroupsSlice(input: unknown): GroupsPrepareResult {
  const result = GroupsSaveSliceV1Schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `Invalid snapshot at groups.${path}: ${message}`,
    }
  }

  const parsed = result.data

  const groupIds = new Map<string, number>()
  let defaultGroupCount = 0
  for (const [index, group] of parsed.groups.entries()) {
    if (group.id === DEFAULT_GROUP_ID) defaultGroupCount += 1
    const firstIndex = groupIds.get(group.id)
    if (firstIndex !== undefined) {
      return {
        ok: false,
        reason: `Invalid snapshot at groups.${index}.id: Duplicate group id "${group.id}" also appears at groups.${firstIndex}.id`,
      }
    }
    groupIds.set(group.id, index)
  }

  if (defaultGroupCount > 1) {
    return {
      ok: false,
      reason: 'Invalid snapshot at groups: Duplicate default group.',
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

  prepareImport: parseGroupsSlice,

  applyImport: (value) => {
    useGroupStore.setState({
      groups: value.groups as Group[],
      stickyGroupId: null,
    })
  },
}
