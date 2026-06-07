import { z } from 'zod'

import type { Slice } from '@/shared/utils/slice'

import { GroupSchema } from './schema'
import { useGroupStore } from './store'
import type { Group } from './types'

export const groupsSlice: Slice<Group[]> = {
  name: 'groups',
  schema: z.array(GroupSchema),
  export: (): Group[] => useGroupStore.getState().groups,
  apply: (groups: Group[]) => {
    useGroupStore.setState({ groups })
  },
}
