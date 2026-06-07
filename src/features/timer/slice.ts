import type { Slice } from '@/shared/utils/slice'

import { TimerSettingsSchema } from './schema'
import { useTimerStore } from './store'
import type { TimerSettings } from './types'

export const timerSlice: Slice<TimerSettings> = {
  name: 'timer',
  schema: TimerSettingsSchema,
  export: (): TimerSettings => useTimerStore.getState().settings,
  apply: (settings: TimerSettings) => {
    useTimerStore.getState().setTimerSettings(settings)
  },
}
