import { groupsSlice } from '@/features/groups'
import { plannerSlice } from '@/features/planner'
import { tasksSlice } from '@/features/tasks'
import { timerSlice } from '@/features/timer'
import type { Slice } from '@/shared/utils/slice'

export const slices: Slice[] = [
  tasksSlice,
  groupsSlice,
  timerSlice,
  plannerSlice,
]
