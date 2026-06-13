import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { formatDate } from '@/shared/dates'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { PlannerStateSchema } from './schema'

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface PlannerState {
  weekStartDay: WeekStartDay
  browseDate: string | null
}

interface PlannerActions {
  setWeekStartDay: (day: WeekStartDay) => void
  setBrowseDate: (date: string | null) => void
  stepBrowseDate: (delta: 1 | -1) => void
}

export type PlannerStore = PlannerState & PlannerActions

const plannerInit: PlannerState = { weekStartDay: 1, browseDate: null }

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      weekStartDay: 1,
      browseDate: null,

      setWeekStartDay: (day) => set({ weekStartDay: day }),

      setBrowseDate: (date) => set({ browseDate: date }),

      stepBrowseDate: (delta) => {
        const current = get().browseDate
        const base = current ? new Date(current) : new Date()
        base.setDate(base.getDate() + delta)
        set({ browseDate: formatDate(base) })
      },
    }),
    {
      name: 'daybox-planner',
      onRehydrateStorage: createValidatedRehydrate<PlannerStore>({
        name: 'daybox-planner',
        schema: PlannerStateSchema,
        init: plannerInit,
      }),
    },
  ),
)
