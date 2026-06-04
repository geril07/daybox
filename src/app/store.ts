import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Group, AppSettings, View, TimerSettings } from '../shared/types'
import { DEFAULT_APP_SETTINGS, GROUP_COLORS } from '../shared/types'
import { generateId } from '../shared/id'
import { formatDate } from '../shared/dates'

export interface AppState {
  version: number
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
  view: View
  browseDate: string | null
  focusedTaskId: string | null
  stickyGroupId: string | null
}

interface AppActions {
  addTask: (title: string, groupId?: string, date?: string | null) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void
  addGroup: (name: string) => Group
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string, reassignToDefault?: boolean) => void
  updateSettings: (updates: Partial<AppSettings>) => void
  updateTimerSettings: (updates: Partial<TimerSettings>) => void
  setView: (view: View) => void
  setBrowseDate: (date: string | null) => void
  setFocusedTaskId: (id: string | null) => void
  setStickyGroupId: (id: string | null) => void
  getDefaultGroup: () => Group | undefined
  getGroupColorIndex: () => number
}

const CURRENT_VERSION = 1

const DEFAULT_GROUP_ID = 'default'

const initialGroups: Group[] = [
  { id: DEFAULT_GROUP_ID, name: 'General', color: GROUP_COLORS[0], createdAt: new Date().toISOString() },
]

export type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      version: CURRENT_VERSION,
      tasks: [],
      groups: initialGroups,
      settings: DEFAULT_APP_SETTINGS,
      view: 'today' as View,
      browseDate: null,
      focusedTaskId: null,
      stickyGroupId: null,

      addTask: (title: string, groupId?: string, date?: string | null) => {
        const task: Task = {
          id: generateId(),
          title,
          groupId: groupId || get().stickyGroupId || DEFAULT_GROUP_ID,
          date: date !== undefined ? date : null,
          pomoEstimate: 0,
          pomoCompleted: 0,
          sortOrder: get().tasks.filter(t => t.date === (date !== undefined ? date : null)).length,
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
        }
        set(state => ({ tasks: [...state.tasks, task] }))
        return task
      },

      updateTask: (id, updates) =>
        set(state => ({
          tasks: state.tasks.map(t => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: id =>
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id),
        })),

      toggleTask: id =>
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id
              ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
              : t,
          ),
        })),

      reorderTasks: tasks =>
        set({
          tasks: tasks.map((t, i) => ({ ...t, sortOrder: i })),
        }),

      addGroup: (name: string) => {
        const colorIndex = get().getGroupColorIndex()
        const group: Group = {
          id: generateId(),
          name,
          color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
          createdAt: new Date().toISOString(),
        }
        set(state => ({ groups: [...state.groups, group] }))
        return group
      },

      renameGroup: (id, name) =>
        set(state => ({
          groups: state.groups.map(g => (g.id === id ? { ...g, name } : g)),
        })),

      deleteGroup: (id, reassignToDefault = false) => {
        const state = get()
        if (state.groups.length <= 1) return

        set(s => ({
          groups: s.groups.filter(g => g.id !== id),
          tasks: reassignToDefault
            ? s.tasks.map(t => (t.groupId === id ? { ...t, groupId: DEFAULT_GROUP_ID } : t))
            : s.tasks.filter(t => t.groupId !== id),
        }))
      },

      updateSettings: updates =>
        set(state => ({
          settings: { ...state.settings, ...updates },
        })),

      updateTimerSettings: updates =>
        set(state => ({
          settings: {
            ...state.settings,
            timer: { ...state.settings.timer, ...updates },
          },
        })),

      setView: view => set({ view }),
      setBrowseDate: date => set({ browseDate: date }),
      setFocusedTaskId: id => set({ focusedTaskId: id }),
      setStickyGroupId: id => set({ stickyGroupId: id }),

      getDefaultGroup: () => get().groups.find(g => g.id === DEFAULT_GROUP_ID),

      getGroupColorIndex: () => {
        const state = get()
        return state.groups.length % GROUP_COLORS.length
      },
    }),
    {
      name: 'daybox-app-store',
      version: CURRENT_VERSION,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Partial<AppState>
        if (version < CURRENT_VERSION) {
          return {
            ...state,
            version: CURRENT_VERSION,
            tasks: state.tasks ?? [],
            groups: state.groups ?? initialGroups,
            settings: state.settings ?? DEFAULT_APP_SETTINGS,
            view: state.view ?? 'today',
            browseDate: state.browseDate ?? null,
            focusedTaskId: state.focusedTaskId ?? null,
            stickyGroupId: state.stickyGroupId ?? null,
          }
        }
        return state as AppState & AppActions
      },
    },
  ),
)
