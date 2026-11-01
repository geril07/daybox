import { create } from 'zustand'

import { generateId } from '@/shared/id'

import { resetHistoryDatabase } from './storage/db'
import { migrateLegacyHistory } from './storage/legacy'
import {
  appendStoredEvent,
  ensureStoredTrackingStart,
  loadStoredHistory,
  replaceStoredHistory,
} from './storage/repository'
import type { HistoryEvent, HistoryEventInput, TrackingStart } from './types'

export type HistoryLoadState = 'ready' | 'failed'

interface HistoryState extends TrackingStart {
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

let loadPromise: Promise<HistoryLoadState> | null = null
let warnedStorageFailure = false
let storageFailed = false
let replacedByImport = false
const inFlight = new Set<Promise<void>>()

function reportStorageFailure(error: unknown) {
  storageFailed = true
  if (warnedStorageFailure) return
  warnedStorageFailure = true
  console.warn('[daybox] Activity history storage unavailable', error)
}

function trackWrite(write: Promise<void>) {
  const tracked = write.catch(reportStorageFailure)
  inFlight.add(tracked)
  void tracked.finally(() => inFlight.delete(tracked))
}

function mergeEvents(stored: HistoryEvent[], current: HistoryEvent[]) {
  const known = new Set(current.map((event) => event.id))
  return [...stored.filter((event) => !known.has(event.id)), ...current]
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  ...historyInit,

  recordEvent: (input, occurredAt = new Date()) => {
    const event: HistoryEvent = {
      ...input,
      id: generateId(),
      at: occurredAt.toISOString(),
      utcOffsetMinutes: utcOffsetMinutes(occurredAt),
    }
    set((state) => ({ events: [...state.events, event] }))
    trackWrite(appendStoredEvent(event))
  },
}))

async function loadHistory(): Promise<HistoryLoadState> {
  try {
    await migrateLegacyHistory()
    const { events, trackingStart } = await loadStoredHistory()
    const tracking =
      trackingStart ??
      (await ensureStoredTrackingStart({
        trackingStartedAt: historyInit.trackingStartedAt,
        trackingUtcOffsetMinutes: historyInit.trackingUtcOffsetMinutes,
      }))
    // A data import restates the history; loaded records must not come back.
    if (!replacedByImport) {
      useHistoryStore.setState((state) => ({
        ...tracking,
        events: mergeEvents(events, state.events),
      }))
    }
    return 'ready'
  } catch (error) {
    reportStorageFailure(error)
    return 'failed'
  }
}

/**
 * Resolves once stored history is in memory. Callers that write a snapshot must
 * treat `failed` as "history is missing", not as "history is empty".
 */
export function ensureHistoryLoaded(): Promise<HistoryLoadState> {
  loadPromise ??= loadHistory()
  return loadPromise
}

/** Resolves once every queued storage write has settled. */
export function flushHistoryWrites(): Promise<void> {
  return Promise.all([...inFlight]).then(() => undefined)
}

/** True once any load or write of the stored history has failed. */
export function historyStorageFailed(): boolean {
  return storageFailed
}

/** Replaces both memory and storage, used by a confirmed snapshot import. */
export function replaceHistory(history: HistoryState) {
  replacedByImport = true
  useHistoryStore.setState({ ...history })
  trackWrite(
    replaceStoredHistory(history.events, {
      trackingStartedAt: history.trackingStartedAt,
      trackingUtcOffsetMinutes: history.trackingUtcOffsetMinutes,
    }),
  )
}

export function resetHistoryForTests() {
  loadPromise = null
  warnedStorageFailure = false
  storageFailed = false
  replacedByImport = false
  inFlight.clear()
  resetHistoryDatabase()
  useHistoryStore.setState({ ...createEmptyHistory(), events: [] })
}

void ensureHistoryLoaded()
