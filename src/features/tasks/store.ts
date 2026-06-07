import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_GROUP_ID } from '@/features/groups'
import { useTimerStore } from '@/features/timer'
import { generateId } from '@/shared/id'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { TaskSchema } from './schema'
import type { Task } from './types'

const TaskStateSchema = z.object({
  tasks: z.array(TaskSchema),
})

interface TaskState {
  tasks: Task[]
}

interface TaskActions {
  addTask: (
    title: string,
    groupId?: string,
    date?: string | null,
  ) => Task | null
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  reorderTasks: (date: string | null, taskIds: string[]) => void
  reassignTasks: (fromGroupId: string, toGroupId: string) => void
  deleteTasksByGroupId: (groupId: string) => void
}

export type TaskStore = TaskState & TaskActions

const taskInit: TaskState = { tasks: [] }

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

        addTask: (title: string, groupId?: string, date?: string | null) => {
          const trimmed = title.trim()
          if (trimmed.length === 0 || trimmed.length > 280) {
            console.warn(
              `[daybox] Task title ${trimmed.length > 280 ? `exceeds 280 character limit (${trimmed.length})` : 'is empty'}`,
            )
            return null
          }
          const task: Task = {
            id: generateId(),
            title: trimmed,
            groupId: groupId || DEFAULT_GROUP_ID,
            date: date !== undefined ? date : null,
            pomoEstimate: 0,
            pomoCompleted: 0,
            sortOrder: 0,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
          }
          set((state) => {
            const sortOrder = state.tasks.filter(
              (t) => t.date === (date !== undefined ? date : null),
            ).length
            return { tasks: [...state.tasks, { ...task, sortOrder }] }
          })
          return task
        },

        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t,
            ),
          })),

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

        reorderTasks: (date, taskIds) =>
          set((state) => {
            const inBucket = new Set(
              state.tasks.filter((t) => t.date === date).map((t) => t.id),
            )
            const valid = taskIds.filter((id) => inBucket.has(id))
            if (valid.length !== taskIds.length) {
              console.warn(
                `[daybox] reorderTasks: ignored ${taskIds.length - valid.length} id(s) not in bucket (date=${date === null ? 'null' : date})`,
              )
            }
            const newOrder = new Map(valid.map((id, i) => [id, i] as const))
            console.log('newOrder :', newOrder)
            return {
              tasks: state.tasks.map((t) =>
                newOrder.has(t.id)
                  ? { ...t, sortOrder: newOrder.get(t.id)! }
                  : t,
              ),
            }
          }),

        reassignTasks: (fromGroupId, toGroupId) => {
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.groupId === fromGroupId ? { ...t, groupId: toGroupId } : t,
            ),
          }))
        },

        deleteTasksByGroupId: (groupId) => {
          const focused = useTimerStore.getState().focusedTaskId
          const focusedInGroup =
            focused !== null &&
            get().tasks.some((t) => t.id === focused && t.groupId === groupId)
          set((state) => ({
            tasks: state.tasks.filter((t) => t.groupId !== groupId),
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
      }),
    },
  ),
)
