import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { HistoryEvent, TrackingStart } from '../types'

export const HISTORY_DB_NAME = 'daybox'
export const HISTORY_DB_VERSION = 2
export const EVENTS_STORE = 'historyEvents'
export const META_STORE = 'historyMeta'
export const TRACKING_START_KEY = 'trackingStarted'

/**
 * A stored event plus its sequence. The record is keyed by the random event
 * `id`, so key order is meaningless: `seq` fixes the order events were recorded
 * in and survives reloads.
 */
export type HistoryRecord = HistoryEvent & { seq: number }

interface HistoryMetaRecord extends TrackingStart {
  key: string
}

interface HistoryDatabaseSchema extends DBSchema {
  historyEvents: {
    key: string
    value: HistoryRecord
    indexes: { at: string; seq: number }
  }
  historyMeta: {
    key: string
    value: HistoryMetaRecord
  }
}

export type HistoryDatabase = IDBPDatabase<HistoryDatabaseSchema>

let databasePromise: Promise<HistoryDatabase> | null = null

function closeAndForget() {
  const pending = databasePromise
  databasePromise = null
  void pending?.then(
    (database) => database.close(),
    () => undefined,
  )
}

export function getHistoryDatabase(): Promise<HistoryDatabase> {
  databasePromise ??= openDB<HistoryDatabaseSchema>(
    HISTORY_DB_NAME,
    HISTORY_DB_VERSION,
    {
      upgrade(database, oldVersion, _newVersion, transaction) {
        if (!database.objectStoreNames.contains(EVENTS_STORE)) {
          const events = database.createObjectStore(EVENTS_STORE, {
            keyPath: 'id',
          })
          events.createIndex('at', 'at')
          events.createIndex('seq', 'seq', { unique: true })
        } else if (oldVersion < 2) {
          // Version 1 shipped both with and without the sequence index, so only
          // add it when it is missing.
          const events = transaction.objectStore(EVENTS_STORE)
          if (!events.indexNames.contains('seq')) {
            events.createIndex('seq', 'seq', { unique: true })
          }
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' })
        }
      },
      // Another tab wants a higher version: let go so it is not blocked. A
      // terminated connection is dead, so the next call reopens the database.
      blocking: closeAndForget,
      terminated: closeAndForget,
    },
  )
  return databasePromise
}

// Tests replace the global IDBFactory, so the cached connection must be dropped too.
export function resetHistoryDatabase() {
  databasePromise = null
}
