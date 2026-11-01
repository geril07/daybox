import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { HistoryEvent } from '../types'

export const HISTORY_DB_NAME = 'daybox'
export const HISTORY_DB_VERSION = 1
export const EVENTS_STORE = 'historyEvents'
export const META_STORE = 'historyMeta'
export const TRACKING_START_KEY = 'trackingStarted'

export interface TrackingStart {
  trackingStartedAt: string
  trackingUtcOffsetMinutes: number
}

interface HistoryMetaRecord extends TrackingStart {
  key: string
}

interface HistoryDatabaseSchema extends DBSchema {
  historyEvents: {
    key: string
    value: HistoryEvent
    indexes: { at: string }
  }
  historyMeta: {
    key: string
    value: HistoryMetaRecord
  }
}

export type HistoryDatabase = IDBPDatabase<HistoryDatabaseSchema>

let databasePromise: Promise<HistoryDatabase> | null = null

export function getHistoryDatabase(): Promise<HistoryDatabase> {
  databasePromise ??= openDB<HistoryDatabaseSchema>(
    HISTORY_DB_NAME,
    HISTORY_DB_VERSION,
    {
      upgrade(database) {
        const events = database.createObjectStore(EVENTS_STORE, {
          keyPath: 'id',
        })
        events.createIndex('at', 'at')
        database.createObjectStore(META_STORE, { keyPath: 'key' })
      },
    },
  )
  return databasePromise
}

// Tests replace the global IDBFactory, so the cached connection must be dropped too.
export function resetHistoryDatabase() {
  databasePromise = null
}
