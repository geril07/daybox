import { z } from 'zod'

import type { Slice } from '@/shared/utils/slice'

import { TaskSchema } from './schema'
import { useTaskStore } from './store'
import type { Task } from './types'

export const tasksSlice: Slice<Task[]> = {
  name: 'tasks',
  schema: z.array(TaskSchema),
  export: (): Task[] => useTaskStore.getState().tasks,
  apply: (tasks: Task[]) => {
    useTaskStore.setState({ tasks })
  },
}
