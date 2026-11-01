import { HistoryEventSchema, TrackingStartSchema } from '../schema'
import type { HistoryEvent, TrackingStart } from '../types'
import {
  EVENTS_STORE,
  META_STORE,
  TRACKING_START_KEY,
  getHistoryDatabase,
  resetHistoryDatabase,
  type HistoryRecord,
} from './db'

export interface StoredHistory {
  events: HistoryEvent[]
  trackingStart: TrackingStart | null
}

function toTrackingStart(meta: {
  trackingStartedAt: string
  trackingUtcOffsetMinutes: number
}): TrackingStart {
  return {
    trackingStartedAt: meta.trackingStartedAt,
    trackingUtcOffsetMinutes: meta.trackingUtcOffsetMinutes,
  }
}

async function writeForTransaction(
  transaction: {
    done: Promise<unknown>
    abort: () => void
  },
  writes: Promise<unknown>[],
) {
  try {
    await Promise.all([...writes, transaction.done])
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // Already aborted or finished; the original error is what matters.
    }
    throw error
  }
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

  // `getAll` returns key order (random ids); the record sequence is the order
  // events were actually recorded in.
  const ordered = [...records].sort((a, b) => (a.seq || 0) - (b.seq || 0))

  const events: HistoryEvent[] = []
  let skipped = 0
  for (const record of ordered) {
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

  // An unreadable tracking start is treated as missing; ensureStoredTrackingStart
  // replaces it with a fresh value and warns.
  const parsedMeta = meta
    ? TrackingStartSchema.safeParse(toTrackingStart(meta))
    : null

  return {
    events,
    trackingStart: parsedMeta?.success ? parsedMeta.data : null,
  }
}

export async function appendStoredEvent(event: HistoryEvent) {
  const database = await getHistoryDatabase()
  const transaction = database.transaction(EVENTS_STORE, 'readwrite')
  const events = transaction.objectStore(EVENTS_STORE)
  const last = await events.index('seq').openCursor(null, 'prev')
  const record: HistoryRecord = { ...event, seq: (last?.value.seq ?? 0) + 1 }
  await writeForTransaction(transaction, [events.put(record)])
}

/**
 * Appends the given events in array order after the last stored record, keeping
 * whatever is already there. Migration uses it so a re-run after a partial
 * write cannot drop events recorded in between.
 */
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
  const last = await eventStore.index('seq').openCursor(null, 'prev')
  const storedSeqs = new Map(
    (await eventStore.getAll()).map((record) => [record.id, record.seq]),
  )
  let next = (last?.value.seq ?? 0) + 1
  const writes = [
    ...events.map((event) => {
      // An event that is already stored keeps its position, so re-running a
      // migration cannot push migrated events behind newer ones.
      const seq = storedSeqs.get(event.id) ?? next
      if (!storedSeqs.has(event.id)) next += 1
      return eventStore.put({ ...event, seq } satisfies HistoryRecord)
    }),
    transaction
      .objectStore(META_STORE)
      .put({ key: TRACKING_START_KEY, ...trackingStart }),
  ]
  await writeForTransaction(transaction, writes)
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
    ...events.map((event, index) =>
      eventStore.put({ ...event, seq: index + 1 } satisfies HistoryRecord),
    ),
    transaction
      .objectStore(META_STORE)
      .put({ key: TRACKING_START_KEY, ...trackingStart }),
  ]
  await writeForTransaction(transaction, writes)
}

export async function ensureStoredTrackingStart(
  fallback: TrackingStart,
): Promise<TrackingStart> {
  const database = await getHistoryDatabase()
  // One readwrite transaction so a concurrent import cannot slip between the
  // read and the write and then be overwritten.
  const transaction = database.transaction(META_STORE, 'readwrite')
  const meta = transaction.objectStore(META_STORE)
  const stored = await meta.get(TRACKING_START_KEY)
  if (stored) {
    const parsed = TrackingStartSchema.safeParse(toTrackingStart(stored))
    if (!parsed.success) {
      console.warn('[daybox] Replaced invalid activity tracking start')
    } else {
      await transaction.done
      return parsed.data
    }
  }
  await meta.put({ key: TRACKING_START_KEY, ...fallback })
  await transaction.done
  return fallback
}

export { resetHistoryDatabase }
