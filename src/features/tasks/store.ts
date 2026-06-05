import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_GROUP_ID } from '@/features/groups'
import { useTimerStore } from '@/features/timer'
import { generateId } from '@/shared/id'
import { createValidatedPersist } from '@/shared/utils/persistence'

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
  reorderTasks: (tasks: Task[]) => void
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

        reorderTasks: (tasks) =>
          set({
            tasks: tasks.map((t, i) => ({ ...t, sortOrder: i })),
          }),

        reassignTasks: (fromGroupId, toGroupId) => {
          const focused = useTimerStore.getState().focusedTaskId
          const focusedInFromGroup =
            focused !== null &&
            get().tasks.some(
              (t) => t.id === focused && t.groupId === fromGroupId,
            )
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.groupId === fromGroupId ? { ...t, groupId: toGroupId } : t,
            ),
          }))
          if (focusedInFromGroup) {
            useTimerStore.getState().setFocusedTaskId(null)
          }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createValidatedPersist('daybox-tasks', TaskStateSchema, taskInit) as any,
  ),
)
