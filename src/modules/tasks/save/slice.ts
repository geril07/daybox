import type { SaveSlice } from '@/modules/data-portability/types'

import { useTaskStore } from '../store'
import type { Task } from '../types'
import {
  TasksSaveSliceV1Schema,
  type TasksSaveSliceCurrent,
} from './versions/v1'

type TasksPrepareResult = ReturnType<
  SaveSlice<'tasks', TasksSaveSliceCurrent>['prepareImport']
>

function parseTasksSlice(input: unknown): TasksPrepareResult {
  const result = TasksSaveSliceV1Schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'root'
    const message = issue?.message ?? 'Invalid value'
    return {
      ok: false,
      reason: `Invalid snapshot at tasks.${path}: ${message}`,
    }
  }

  return { ok: true, value: result.data }
}

export const tasksSaveSlice: SaveSlice<'tasks', TasksSaveSliceCurrent> = {
  name: 'tasks',
  currentVersion: 1,
  missing: { kind: 'required' },

  exportSlice: () => ({
    version: 1,
    tasks: useTaskStore.getState().tasks,
  }),

  prepareImport: parseTasksSlice,

  applyImport: (value) => {
    useTaskStore.setState({ tasks: value.tasks as Task[] })
  },
}
