import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { TaskSchema } from '@/features/tasks/schema'
import type { Task } from '@/features/tasks/types'
import { generateId } from '@/shared/id'
import { createValidatedPersist } from '@/shared/utils/persistence'

const DEFAULT_GROUP_ID = 'default'

const TaskStateSchema = z.object({
  tasks: z.array(TaskSchema),
})

interface TaskState {
  tasks: Task[]
}

interface TaskActions {
  addTask: (title: string, groupId?: string, date?: string | null) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void
  reassignTasks: (fromGroupId: string, toGroupId: string) => void
  deleteTasksByGroupId: (groupId: string) => void
}

export type TaskStore = TaskState & TaskActions

const taskInit: TaskState = { tasks: [] }

function createPlaceholderTask(): Task {
  return {
    id: '',
    title: '',
    groupId: '',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: '',
  }
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (title: string, groupId?: string, date?: string | null) => {
        const trimmed = title.trim()
        if (trimmed.length === 0 || trimmed.length > 280) {
          console.warn(
            `[daybox] Task title ${trimmed.length > 280 ? `exceeds 280 character limit (${trimmed.length})` : 'is empty'}`,
          )
          return createPlaceholderTask()
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

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

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

      reassignTasks: (fromGroupId, toGroupId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.groupId === fromGroupId ? { ...t, groupId: toGroupId } : t,
          ),
        })),

      deleteTasksByGroupId: (groupId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.groupId !== groupId),
        })),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createValidatedPersist('daybox-tasks', TaskStateSchema, taskInit) as any,
  ),
)
