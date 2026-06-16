import { DEFAULT_GROUP_ID } from '@/modules/groups'
import type { SaveSlice } from '@/shared/save-slice'
import { detectDuplicateId, parseSliceInput } from '@/shared/utils/save-helpers'

import { useTaskStore } from '../store'
import type { Task } from '../types'
import {
  TasksSaveSliceV1Schema,
  type TasksSaveSliceCurrent,
} from './versions/v1'

function parseTasksSlice(
  input: unknown,
): ReturnType<SaveSlice<'tasks', TasksSaveSliceCurrent>['prepareImport']> {
  const result = parseSliceInput('tasks', TasksSaveSliceV1Schema, input)
  if (!result.ok) return result

  const parsed = result.value

  const duplicateError = detectDuplicateId(
    parsed.tasks,
    (t) => t.id,
    'task',
    'tasks',
  )
  if (duplicateError) {
    return { ok: false, reason: duplicateError }
  }

  return { ok: true, value: parsed }
}

export const tasksSaveSlice: SaveSlice<'tasks', TasksSaveSliceCurrent> = {
  name: 'tasks',
  currentVersion: 1,
  missing: { kind: 'required' },

  exportSlice: () => ({
    version: 1,
    tasks: useTaskStore.getState().tasks,
  }),

  validateExport: (value) =>
    parseSliceInput('tasks', TasksSaveSliceV1Schema, value),

  prepareImport: parseTasksSlice,

  postPrepare: (current, allSlices) => {
    const groupSlice = allSlices.groups
    if (!groupSlice) {
      return { ok: true, value: current }
    }

    const groupIds = new Set(groupSlice.groups.map((g) => g.id))
    const warnings: string[] = []

    const tasks = current.tasks.map((task, index) => {
      if (groupIds.has(task.groupId)) return task
      warnings.push(
        `Task group "${task.groupId}" not found at tasks.${index}.groupId. Task reassigned to default group.`,
      )
      return { ...task, groupId: DEFAULT_GROUP_ID }
    })

    if (warnings.length === 0) {
      return { ok: true, value: current }
    }

    return {
      ok: true,
      value: { ...current, tasks },
      warnings,
    }
  },

  applyImport: (value) => {
    useTaskStore.setState({ tasks: value.tasks as Task[] })
  },
}
