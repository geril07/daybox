import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HistoryEvent } from '../types'
import { resetHistoryDatabase } from './db'
import { LEGACY_HISTORY_KEY, migrateLegacyHistory } from './legacy'
import { loadStoredHistory } from './repository'

const tracking = {
  trackingStartedAt: '2026-09-01T00:00:00.000Z',
  trackingUtcOffsetMinutes: 120,
}

function event(id: string): HistoryEvent {
  return {
    id,
    type: 'task.completed',
    at: '2026-10-28T10:00:00.000Z',
    utcOffsetMinutes: 120,
    taskId: `task-${id}`,
    title: 'Write report',
    groupId: 'work',
    groupName: 'Work',
    date: '2026-10-28',
  }
}

function writeLegacyBlob(state: unknown) {
  localStorage.setItem(
    LEGACY_HISTORY_KEY,
    JSON.stringify({ state, version: 0 }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
  resetHistoryDatabase()
  localStorage.clear()
})

describe('legacy history migration', () => {
  it('copies events and the tracking start, then removes the key', async () => {
    writeLegacyBlob({ ...tracking, events: [event('a'), event('b')] })

    await migrateLegacyHistory()

    const { events, trackingStart } = await loadStoredHistory()
    expect(events.map((e) => e.id)).toEqual(['a', 'b'])
    expect(trackingStart).toEqual(tracking)
    expect(localStorage.getItem(LEGACY_HISTORY_KEY)).toBeNull()
  })

  it('does not duplicate events when it runs again', async () => {
    writeLegacyBlob({ ...tracking, events: [event('a')] })
    await migrateLegacyHistory()
    writeLegacyBlob({ ...tracking, events: [event('a')] })

    await migrateLegacyHistory()

    expect((await loadStoredHistory()).events).toHaveLength(1)
  })

  it('drops an invalid blob without touching stored history', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    writeLegacyBlob({ events: [{ id: 'a', type: 'task.unknown' }] })

    await migrateLegacyHistory()

    expect(localStorage.getItem(LEGACY_HISTORY_KEY)).toBeNull()
    expect((await loadStoredHistory()).events).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a legacy key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await migrateLegacyHistory()

    expect((await loadStoredHistory()).events).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})
