import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { generateId } from '@/shared/id'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { HistoryStateSchema } from './schema'
import type { HistoryEvent, HistoryEventInput } from './types'

export const HISTORY_STORAGE_KEY = 'daybox-history'

interface HistoryState {
  trackingStartedAt: string
  trackingUtcOffsetMinutes: number
  events: HistoryEvent[]
}

interface HistoryActions {
  recordEvent: (input: HistoryEventInput, occurredAt?: Date) => void
}

export type HistoryStore = HistoryState & HistoryActions

// getTimezoneOffset is west-positive; history stores the ISO east-positive offset.
function utcOffsetMinutes(date: Date) {
  return -date.getTimezoneOffset() || 0
}

export function createEmptyHistory(now = new Date()): HistoryState {
  return {
    trackingStartedAt: now.toISOString(),
    trackingUtcOffsetMinutes: utcOffsetMinutes(now),
    events: [],
  }
}

const historyInit = createEmptyHistory()

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      ...historyInit,

      recordEvent: (input, occurredAt = new Date()) => {
        const event: HistoryEvent = {
          ...input,
          id: generateId(),
          at: occurredAt.toISOString(),
          utcOffsetMinutes: utcOffsetMinutes(occurredAt),
        }
        set((state) => ({ events: [...state.events, event] }))
      },
    }),
    {
      name: HISTORY_STORAGE_KEY,
      onRehydrateStorage: createValidatedRehydrate<HistoryStore>({
        name: HISTORY_STORAGE_KEY,
        schema: HistoryStateSchema,
        init: historyInit,
      }),
    },
  ),
)

// persist writes only on setState; save the tracking start on first launch
// so a later launch does not move it forward.
if (localStorage.getItem(HISTORY_STORAGE_KEY) === null) {
  useHistoryStore.setState({})
}
