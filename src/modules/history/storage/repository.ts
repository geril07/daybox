import { HistoryEventSchema } from '../schema'
import type { HistoryEvent } from '../types'
import {
  EVENTS_STORE,
  META_STORE,
  TRACKING_START_KEY,
  getHistoryDatabase,
  type TrackingStart,
} from './db'

export interface StoredHistory {
  events: HistoryEvent[]
  trackingStart: TrackingStart | null
}

function toMetaRecord(trackingStart: TrackingStart) {
  return { key: TRACKING_START_KEY, ...trackingStart }
}

export async function loadStoredHistory(): Promise<StoredHistory> {
  const database = await getHistoryDatabase()
  const transaction = database.transaction(
    [EVENTS_STORE, META_STORE],
    'readonly',
  )
  const [records, meta] = await Promise.all([
    transaction.objectStore(EVENTS_STORE).getAll(),
    transaction.objectStore(META_STORE).get(TRACKING_START_KEY),
  ])

  const events: HistoryEvent[] = []
  let skipped = 0
  for (const record of records) {
    const parsed = HistoryEventSchema.safeParse(record)
    if (parsed.success) {
      events.push(parsed.data)
    } else {
      skipped += 1
    }
  }
  if (skipped > 0) {
    console.warn(
      `[daybox] Dropped ${skipped} invalid activity history record(s)`,
    )
  }

  return {
    events,
    trackingStart: meta
      ? {
          trackingStartedAt: meta.trackingStartedAt,
          trackingUtcOffsetMinutes: meta.trackingUtcOffsetMinutes,
        }
      : null,
  }
}

export async function appendStoredEvent(event: HistoryEvent) {
  const database = await getHistoryDatabase()
  await database.put(EVENTS_STORE, event)
}

// Both writers queue every request in one tick: awaiting between them would let
// the transaction auto-commit.
export async function putStoredHistory(
  events: HistoryEvent[],
  trackingStart: TrackingStart,
) {
  const database = await getHistoryDatabase()
  const transaction = database.transaction(
    [EVENTS_STORE, META_STORE],
    'readwrite',
  )
  const eventStore = transaction.objectStore(EVENTS_STORE)
  const writes = [
    ...events.map((event) => eventStore.put(event)),
    transaction.objectStore(META_STORE).put(toMetaRecord(trackingStart)),
  ]
  await Promise.all(writes)
  await transaction.done
}

export async function replaceStoredHistory(
  events: HistoryEvent[],
  trackingStart: TrackingStart,
) {
  const database = await getHistoryDatabase()
  const transaction = database.transaction(
    [EVENTS_STORE, META_STORE],
    'readwrite',
  )
  const eventStore = transaction.objectStore(EVENTS_STORE)
  const writes = [
    eventStore.clear(),
    ...events.map((event) => eventStore.put(event)),
    transaction.objectStore(META_STORE).put(toMetaRecord(trackingStart)),
  ]
  await Promise.all(writes)
  await transaction.done
}

export async function ensureStoredTrackingStart(
  fallback: TrackingStart,
): Promise<TrackingStart> {
  const database = await getHistoryDatabase()
  const stored = await database.get(META_STORE, TRACKING_START_KEY)
  if (stored) {
    return {
      trackingStartedAt: stored.trackingStartedAt,
      trackingUtcOffsetMinutes: stored.trackingUtcOffsetMinutes,
    }
  }
  await database.put(META_STORE, toMetaRecord(fallback))
  return fallback
}
