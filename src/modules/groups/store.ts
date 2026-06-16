import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { GROUP_COLORS } from '@/modules/groups/constants'
import { generateId } from '@/shared/id'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { GroupSchema } from './schema'
import type { Group } from './types'

export const DEFAULT_GROUP_ID = 'default'

const GroupStateSchema = z.object({
  groups: z.array(GroupSchema),
  stickyGroupId: z.string().nullable(),
})

interface GroupState {
  groups: Group[]
  stickyGroupId: string | null
}

interface GroupActions {
  addGroup: (name: string) => Group
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  setGroupColor: (id: string, color: string) => void
  getDefaultGroup: () => Group | undefined
  getGroupColorIndex: () => number
  setStickyGroupId: (id: string | null) => void
}

export type GroupStore = GroupState & GroupActions

const groupInit: GroupState = {
  groups: [
    {
      id: DEFAULT_GROUP_ID,
      name: 'General',
      color: GROUP_COLORS[0],
      createdAt: new Date().toISOString(),
    },
  ],
  stickyGroupId: null,
}

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
        const trimmed = name.trim()
        if (trimmed.length === 0 || trimmed.length > 40) {
          console.warn(
            `[daybox] Group name ${trimmed.length > 40 ? `exceeds 40 character limit (${trimmed.length})` : 'is empty'}`,
          )
          return createPlaceholderGroup()
        }
        const colorIndex = get().getGroupColorIndex()
        const group: Group = {
          id: generateId(),
          name: trimmed,
          color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ groups: [...state.groups, group] }))
        return group
      },

      renameGroup: (id, name) => {
        const trimmed = name.trim()
        if (trimmed.length === 0 || trimmed.length > 40) {
          console.warn(
            `[daybox] Group name ${trimmed.length > 40 ? `exceeds 40 character limit (${trimmed.length})` : 'is empty'}`,
          )
          return
        }
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, name: trimmed } : g,
          ),
        }))
      },

      setGroupColor: (id, color) => {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, color } : g)),
        }))
      },

      deleteGroup: (id) => {
        if (id === DEFAULT_GROUP_ID) return
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
        return ((state.groups.length - 1) % (GROUP_COLORS.length - 1)) + 1
      },

      setStickyGroupId: (id) => set({ stickyGroupId: id }),
    }),
    {
      name: 'daybox-groups',
      onRehydrateStorage: createValidatedRehydrate<GroupStore>({
        name: 'daybox-groups',
        schema: GroupStateSchema,
        init: groupInit,
      }),
    },
  ),
)

function createPlaceholderGroup(): Group {
  return {
    id: '',
    name: '',
    color: '',
    createdAt: '',
  }
}
