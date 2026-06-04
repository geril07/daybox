import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { generateId } from '@/shared/id'
import type { Group } from '@/shared/types'
import { GROUP_COLORS } from '@/shared/types'

const DEFAULT_GROUP_ID = 'default'

interface GroupState {
  groups: Group[]
  stickyGroupId: string | null
}

interface GroupActions {
  addGroup: (name: string) => Group
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  getDefaultGroup: () => Group | undefined
  getGroupColorIndex: () => number
  setStickyGroupId: (id: string | null) => void
}

export type GroupStore = GroupState & GroupActions

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: GROUP_COLORS[0],
          createdAt: new Date().toISOString(),
        },
      ],
      stickyGroupId: null,

      addGroup: (name: string) => {
        const colorIndex = get().getGroupColorIndex()
        const group: Group = {
          id: generateId(),
          name,
          color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ groups: [...state.groups, group] }))
        return group
      },

      renameGroup: (id, name) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
        })),

      deleteGroup: (id) => {
        const state = get()
        if (state.groups.length <= 1) return
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
        }))
      },

      getDefaultGroup: () =>
        get().groups.find((g) => g.id === DEFAULT_GROUP_ID),

      getGroupColorIndex: () => {
        const state = get()
        return state.groups.length % GROUP_COLORS.length
      },

      setStickyGroupId: (id) => set({ stickyGroupId: id }),
    }),
    {
      name: 'daybox-groups',
    },
  ),
)
