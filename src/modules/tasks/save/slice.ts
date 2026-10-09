import { DEFAULT_GROUP_ID } from '@/modules/groups'
import type { SaveSlice } from '@/shared/save-slice'
import { detectDuplicateId, parseSliceInput } from '@/shared/utils/save-helpers'

import { useTaskStore } from '../store'
import { TasksSaveSliceV1Schema } from './versions/v1'
import {
  TasksSaveSliceV2Schema,
  type TasksSaveSliceCurrent,
} from './versions/v2'

function parseTasksSlice(
  input: unknown,
): ReturnType<SaveSlice<'tasks', TasksSaveSliceCurrent>['prepareImport']> {
  const result = parseSliceInput('tasks', TasksSaveSliceV2Schema, input)
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

  const duplicateSeries = detectDuplicateId(
    parsed.series,
    (item) => item.id,
    'series',
    'tasks',
  )
  if (duplicateSeries) return { ok: false, reason: duplicateSeries }

  return { ok: true, value: parsed }
}

export const tasksSaveSlice: SaveSlice<'tasks', TasksSaveSliceCurrent> = {
  name: 'tasks',
  currentVersion: 2,
  missing: { kind: 'required' },

  exportSlice: () => ({
    version: 2,
    tasks: useTaskStore.getState().tasks,
    series: useTaskStore.getState().series,
  }),

  validateExport: (value) => parseTasksSlice(value),

  migrateFrom: {
    1: (input) => {
      const result = parseSliceInput('tasks', TasksSaveSliceV1Schema, input)
      if (!result.ok) return result
      return {
        ok: true,
        value: {
          version: 2,
          series: [],
          tasks: result.value.tasks.map((task) => ({
            ...task,
            seriesId: null,
            occurrenceDate: null,
          })),
        },
      }
    },
  },

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

    const series = current.series.map((item, index) => {
      if (groupIds.has(item.groupId)) return item
      warnings.push(
        `Series group "${item.groupId}" not found at series.${index}.groupId. Series reassigned to default group.`,
      )
      return { ...item, groupId: DEFAULT_GROUP_ID }
    })

    if (warnings.length === 0) {
      return { ok: true, value: current }
    }

    return {
      ok: true,
      value: { ...current, tasks, series },
      warnings,
    }
  },

  applyImport: (value) => {
    useTaskStore.setState({ tasks: value.tasks, series: value.series })
  },
}
