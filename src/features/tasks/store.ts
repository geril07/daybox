import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Task } from '@/features/tasks/types'
import { generateId } from '@/shared/id'

const DEFAULT_GROUP_ID = 'default'

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

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (title: string, groupId?: string, date?: string | null) => {
        const task: Task = {
          id: generateId(),
          title,
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
    {
      name: 'daybox-tasks',
    },
  ),
)
