import { create } from 'zustand'

import { generateId } from '@/shared/id'

import { resetHistoryDatabase, type TrackingStart } from './storage/db'
import { migrateLegacyHistory } from './storage/legacy'
import {
  appendStoredEvent,
  ensureStoredTrackingStart,
  loadStoredHistory,
  replaceStoredHistory,
} from './storage/repository'
import type { HistoryEvent, HistoryEventInput } from './types'

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

let loadPromise: Promise<void> | null = null
let pendingWrites: Promise<void> = Promise.resolve()
let warnedStorageFailure = false
let replacedByImport = false

function reportStorageFailure(error: unknown) {
  if (warnedStorageFailure) return
  warnedStorageFailure = true
  console.warn('[daybox] Activity history storage unavailable', error)
}

function trackWrite(write: Promise<void>) {
  pendingWrites = pendingWrites.then(() => write).catch(reportStorageFailure)
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

async function loadHistory() {
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
    if (replacedByImport) return
    useHistoryStore.setState((state) => ({
      ...tracking,
      events: mergeEvents(events, state.events),
    }))
  } catch (error) {
    reportStorageFailure(error)
  }
}

/** Resolves once stored history is in memory; export paths await it. */
export function ensureHistoryLoaded(): Promise<void> {
  loadPromise ??= loadHistory()
  return loadPromise
}

/** Resolves once every queued storage write has settled. */
export function flushHistoryWrites(): Promise<void> {
  return pendingWrites
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
  pendingWrites = Promise.resolve()
  warnedStorageFailure = false
  replacedByImport = false
  resetHistoryDatabase()
  useHistoryStore.setState({ ...createEmptyHistory(), events: [] })
}

void ensureHistoryLoaded()
