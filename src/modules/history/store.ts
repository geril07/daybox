import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { generateId } from '@/shared/id'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { HistoryStateSchema } from './schema'
import type { HistoryEvent, HistoryEventInput } from './types'

interface HistoryState {
  events: HistoryEvent[]
}

interface HistoryActions {
  recordEvent: (input: HistoryEventInput) => void
}

export type HistoryStore = HistoryState & HistoryActions

const historyInit: HistoryState = { events: [] }

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      events: [],

      recordEvent: (input) => {
        const now = new Date()
        const event: HistoryEvent = {
          ...input,
          id: generateId(),
          at: now.toISOString(),
          // getTimezoneOffset is west-positive; store the ISO east-positive offset.
          utcOffsetMinutes: -now.getTimezoneOffset() || 0,
        }
        set((state) => ({ events: [...state.events, event] }))
      },
    }),
    {
      name: 'daybox-history',
      onRehydrateStorage: createValidatedRehydrate<HistoryStore>({
        name: 'daybox-history',
        schema: HistoryStateSchema,
        init: historyInit,
      }),
    },
  ),
)
