import type { SaveSlice } from '@/modules/data-portability/types'

import { useGroupStore } from '../store'
import type { Group } from '../types'
import {
  GroupsSaveSliceV1Schema,
  type GroupsSaveSliceCurrent,
} from './versions/v1'

type GroupsPrepareResult = ReturnType<
  SaveSlice<'groups', GroupsSaveSliceCurrent>['prepareImport']
>

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

  return { ok: true, value: result.data }
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
