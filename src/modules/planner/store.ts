import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { addDaysToDate, getPlannerDate } from '@/shared/dates'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { PlannerStateSchema } from './schema'

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface PlannerState {
  weekStartDay: WeekStartDay
  browseDate: string | null
  dayStartMinutes: number
}

interface PlannerActions {
  setWeekStartDay: (day: WeekStartDay) => void
  setBrowseDate: (date: string | null) => void
  setDayStartMinutes: (minutes: number) => void
  stepBrowseDate: (delta: 1 | -1) => void
}

export type PlannerStore = PlannerState & PlannerActions

const plannerInit: PlannerState = {
  weekStartDay: 1,
  browseDate: null,
  dayStartMinutes: 0,
}

function isValidDayStartMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 1439
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      ...plannerInit,

      setWeekStartDay: (day) => set({ weekStartDay: day }),

      setBrowseDate: (date) => set({ browseDate: date }),

      setDayStartMinutes: (minutes) => {
        if (!isValidDayStartMinutes(minutes)) {
          console.warn(
            `[daybox] planner: invalid day-start time ${String(minutes)}`,
          )
          return
        }
        set({ dayStartMinutes: minutes })
      },

      stepBrowseDate: (delta) => {
        const current = get().browseDate
        const base =
          current ?? getPlannerDate(new Date(), get().dayStartMinutes ?? 0)
        set({ browseDate: addDaysToDate(base, delta) })
      },
    }),
    {
      name: 'daybox-planner',
      onRehydrateStorage: createValidatedRehydrate<PlannerStore>({
        name: 'daybox-planner',
        schema: PlannerStateSchema,
        init: plannerInit,
        afterValidate: (state) => {
          state.dayStartMinutes ??= 0
        },
      }),
    },
  ),
)
