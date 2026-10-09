import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_GROUP_ID } from '@/modules/groups'
import { useTimerStore } from '@/modules/timer'
import { getDateRange, getWeekEndDate, type WeekStartDay } from '@/shared/dates'
import { generateId } from '@/shared/id'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { SeriesSchema, TaskStateSchema } from './schema'
import {
  compactBucket,
  compactAllBuckets,
  nextSortOrder,
  planOccurrences,
} from './store.helpers'
import type { Task, Series } from './types'

interface TaskState {
  tasks: Task[]
  series: Series[]
}

interface TaskActions {
  ensureOccurrences: (today: string, weekStartDay: WeekStartDay) => void
  addSeries: (
    input: Pick<Series, 'title' | 'weekdays'> &
      Partial<Pick<Series, 'groupId' | 'pomoEstimate'>>,
  ) => Series | null
  updateSeries: (
    id: string,
    updates: Partial<
      Pick<Series, 'title' | 'weekdays' | 'groupId' | 'pomoEstimate' | 'active'>
    >,
  ) => void
  setSeriesActive: (id: string, active: boolean) => void
  reorderSeries: (ids: string[]) => void
  deleteSeries: (id: string) => void
  skipOccurrence: (taskId: string) => void
  addTask: (
    title: string,
    groupId?: string,
    date?: string | null,
  ) => Task | null
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  reorderTasks: (params: { date: string | null; taskIds: string[] }) => void
  reassignTasks: (fromGroupId: string, toGroupId: string) => void
  deleteTasksByGroupId: (groupId: string) => void
}

export type TaskStore = TaskState & TaskActions

const taskInit: TaskState = { tasks: [], series: [] }

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => {
      const clearFocusIfMatching = (taskId: string | null) => {
        if (taskId === null) return
        const focused = useTimerStore.getState().focusedTaskId
        if (focused === taskId) {
          useTimerStore.getState().setFocusedTaskId(null)
        }
      }

      return {
        tasks: [],
        series: [],

        ensureOccurrences: (today, weekStartDay) => {
          const horizon = getDateRange(
            today,
            getWeekEndDate(today, weekStartDay),
          )
          const planned = planOccurrences(get().series, get().tasks, horizon)
          if (planned.length === 0) return
          const createdAt = new Date().toISOString()
          let tasks = [
            ...get().tasks,
            ...planned.map((task) => ({
              ...task,
              id: generateId(),
              createdAt,
            })),
          ]
          for (const date of horizon) tasks = compactBucket(tasks, date)
          set({ tasks })
        },

        addSeries: (input) => {
          const result = SeriesSchema.safeParse({
            ...input,
            groupId: input.groupId || DEFAULT_GROUP_ID,
            pomoEstimate: input.pomoEstimate ?? 0,
            id: generateId(),
            active: true,
            skipDates: [],
            sortOrder: get().series.length,
            createdAt: new Date().toISOString(),
          })
          if (!result.success) {
            console.warn('[daybox] Invalid series', result.error)
            return null
          }
          set({ series: [...get().series, result.data] })
          return result.data
        },

        updateSeries: (id, updates) => {
          const existing = get().series.find((item) => item.id === id)
          if (!existing) return
          const result = SeriesSchema.safeParse({ ...existing, ...updates })
          if (!result.success) {
            console.warn('[daybox] Invalid series update', result.error)
            return
          }
          set({
            series: get().series.map((item) =>
              item.id === id ? result.data : item,
            ),
          })
        },

        setSeriesActive: (id, active) => get().updateSeries(id, { active }),

        reorderSeries: (ids) => {
          const orderedIds = [...new Set(ids)].filter((id) =>
            get().series.some((item) => item.id === id),
          )
          const remaining = [...get().series]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .filter((item) => !orderedIds.includes(item.id))
            .map((item) => item.id)
          const order = [...orderedIds, ...remaining]
          set({
            series: get().series.map((item) => ({
              ...item,
              sortOrder: order.indexOf(item.id),
            })),
          })
        },

        deleteSeries: (id) => {
          const removed = get().tasks.filter((task) => task.seriesId === id)
          set({
            series: get().series.filter((item) => item.id !== id),
            tasks: get().tasks.filter((task) => task.seriesId !== id),
          })
          for (const task of removed) clearFocusIfMatching(task.id)
        },

        skipOccurrence: (taskId) => {
          const task = get().tasks.find((task) => task.id === taskId)
          if (!task || task.seriesId === null || task.occurrenceDate === null)
            return
          set({
            tasks: get().tasks.filter((item) => item.id !== taskId),
            series: get().series.map((item) =>
              item.id === task.seriesId
                ? {
                    ...item,
                    skipDates: [
                      ...new Set([...item.skipDates, task.occurrenceDate!]),
                    ],
                  }
                : item,
            ),
          })
          clearFocusIfMatching(taskId)
        },

        addTask: (title: string, groupId?: string, date?: string | null) => {
          const trimmed = title.trim()
          if (trimmed.length === 0 || trimmed.length > 280) {
            console.warn(
              `[daybox] Task title ${trimmed.length > 280 ? `exceeds 280 character limit (${trimmed.length})` : 'is empty'}`,
            )
            return null
          }
          const taskDate = date !== undefined ? date : null
          const sortOrder = nextSortOrder(get().tasks, taskDate)
          const task: Task = {
            id: generateId(),
            title: trimmed,
            groupId: groupId || DEFAULT_GROUP_ID,
            date: taskDate,
            seriesId: null,
            occurrenceDate: null,
            pomoEstimate: 0,
            pomoCompleted: 0,
            sortOrder,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
          }
          set({ tasks: [...get().tasks, task] })
          return task
        },

        updateTask: (id, updates) =>
          set((state) => {
            const existing = state.tasks.find((t) => t.id === id)
            if (!existing) return state
            const dateChanged =
              updates.date !== undefined && updates.date !== existing.date
            if (dateChanged) {
              const newDate = updates.date as string | null
              const merged = {
                ...updates,
                sortOrder: nextSortOrder(state.tasks, newDate),
              }
              return {
                tasks: state.tasks.map((t) =>
                  t.id === id ? { ...t, ...merged } : t,
                ),
              }
            }
            return {
              tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, ...updates } : t,
              ),
            }
          }),

        deleteTask: (id) => {
          clearFocusIfMatching(id)
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }))
        },

        toggleTask: (id) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed ? new Date().toISOString() : null,
                  }
                : t,
            ),
          })),

        reorderTasks: ({ date, taskIds }) =>
          set((state) => {
            // Phase 1: defensive compact heals duplicates and gaps
            const compacted = compactBucket(state.tasks, date)

            // Phase 2: redistribute
            const valid = taskIds.filter((id) =>
              compacted.some((t) => t.id === id && t.date === date),
            )

            if (valid.length !== taskIds.length) {
              console.warn(
                `[daybox] reorderTasks: ignored ${taskIds.length - valid.length} unknown id(s)`,
              )
            }

            if (valid.length === 0) return { tasks: compacted }

            const survivingSortOrders = compacted
              .filter((t) => valid.includes(t.id))
              .map((t) => t.sortOrder)
              .sort((a, b) => a - b)

            const newOrder = new Map(
              valid.map((id, i) => [id, survivingSortOrders[i]] as const),
            )

            return {
              tasks: compacted.map((t) =>
                newOrder.has(t.id)
                  ? { ...t, sortOrder: newOrder.get(t.id)! }
                  : t,
              ),
            }
          }),

        reassignTasks: (fromGroupId, toGroupId) => {
          set((state) => {
            if (
              !state.tasks.some((t) => t.groupId === fromGroupId) &&
              !state.series.some((item) => item.groupId === fromGroupId)
            ) {
              return state
            }
            const affectedDates = new Set<string | null>()
            for (const t of state.tasks) {
              if (t.groupId === fromGroupId) {
                affectedDates.add(t.date)
              }
            }
            const rewritten = state.tasks.map((t) =>
              t.groupId === fromGroupId ? { ...t, groupId: toGroupId } : t,
            )
            let result = rewritten
            for (const date of affectedDates) {
              result = compactBucket(result, date)
            }
            return {
              tasks: result,
              series: state.series.map((item) =>
                item.groupId === fromGroupId
                  ? { ...item, groupId: toGroupId }
                  : item,
              ),
            }
          })
        },

        deleteTasksByGroupId: (groupId) => {
          const seriesIds = new Set(
            get()
              .series.filter((item) => item.groupId === groupId)
              .map((item) => item.id),
          )
          const focused = useTimerStore.getState().focusedTaskId
          const focusedInGroup =
            focused !== null &&
            get().tasks.some(
              (t) =>
                t.id === focused &&
                (t.groupId === groupId ||
                  (t.seriesId !== null && seriesIds.has(t.seriesId))),
            )
          set((state) => ({
            tasks: state.tasks.filter(
              (t) =>
                t.groupId !== groupId &&
                (t.seriesId === null || !seriesIds.has(t.seriesId)),
            ),
            series: state.series.filter((item) => item.groupId !== groupId),
          }))
          if (focusedInGroup) {
            useTimerStore.getState().setFocusedTaskId(null)
          }
        },
      }
    },
    {
      name: 'daybox-tasks',
      onRehydrateStorage: createValidatedRehydrate<TaskStore>({
        name: 'daybox-tasks',
        schema: TaskStateSchema,
        init: taskInit,
        // afterValidate only fires after successful schema validation (see persistence.ts:39)
        afterValidate: (state) => {
          state.tasks = state.tasks.map((task) => ({
            ...task,
            seriesId: task.seriesId ?? null,
            occurrenceDate: task.occurrenceDate ?? null,
          }))
          state.series = [...(state.series ?? [])]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item, sortOrder) => ({
              ...item,
              sortOrder,
              skipDates: item.skipDates.filter((date) =>
                /^\d{4}-\d{2}-\d{2}$/.test(date),
              ),
            }))
          state.tasks = compactAllBuckets(state.tasks)
        },
      }),
    },
  ),
)
