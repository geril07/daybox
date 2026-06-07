import { z } from 'zod'

import type { Slice } from '@/shared/utils/slice'

import { PlannerStateSchema } from './schema'
import { usePlannerStore } from './store'
import type { WeekStartDay } from './store'

type PlannerState = z.infer<typeof PlannerStateSchema>

export const plannerSlice: Slice<PlannerState> = {
  name: 'planner',
  schema: PlannerStateSchema,
  export: (): PlannerState => {
    const state = usePlannerStore.getState()
    return { weekStartDay: state.weekStartDay, browseDate: state.browseDate }
  },
  apply: ({ weekStartDay, browseDate }: PlannerState) => {
    usePlannerStore.getState().setWeekStartDay(weekStartDay as WeekStartDay)
    usePlannerStore.getState().setBrowseDate(browseDate)
  },
}
