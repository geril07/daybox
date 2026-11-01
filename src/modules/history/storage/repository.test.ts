import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HistoryEvent } from '../types'
import { EVENTS_STORE, getHistoryDatabase, resetHistoryDatabase } from './db'
import {
  appendStoredEvent,
  ensureStoredTrackingStart,
  loadStoredHistory,
  putStoredHistory,
  replaceStoredHistory,
} from './repository'

const tracking = {
  trackingStartedAt: '2026-01-01T00:00:00.000Z',
  trackingUtcOffsetMinutes: 180,
}

function event(id: string, at = '2026-10-28T10:00:00.000Z'): HistoryEvent {
  return {
    id,
    type: 'task.completed',
    at,
    utcOffsetMinutes: 180,
    taskId: `task-${id}`,
    title: 'Write report',
    groupId: 'work',
    groupName: 'Work',
    date: '2026-10-28',
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
  resetHistoryDatabase()
})

describe('history repository', () => {
  it('appends events as separate records keyed by id', async () => {
    await appendStoredEvent(event('a'))
    await appendStoredEvent(event('b'))

    const { events } = await loadStoredHistory()
    expect(events.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('treats a repeated append of the same id as an update', async () => {
    await appendStoredEvent(event('a', '2026-10-28T10:00:00.000Z'))
    await appendStoredEvent(event('a', '2026-10-28T11:00:00.000Z'))

    const { events } = await loadStoredHistory()
    expect(events).toHaveLength(1)
    expect(events[0].at).toBe('2026-10-28T11:00:00.000Z')
  })

  it('reports no tracking start before one is stored', async () => {
    expect((await loadStoredHistory()).trackingStart).toBeNull()
  })

  it('replaces every record', async () => {
    await putStoredHistory([event('a'), event('b')], tracking)
    await replaceStoredHistory([event('c')], tracking)

    expect((await loadStoredHistory()).events.map((e) => e.id)).toEqual(['c'])
  })

  it('keeps existing records when writing a subset', async () => {
    await putStoredHistory([event('a')], tracking)
    await putStoredHistory([event('b')], tracking)

    expect((await loadStoredHistory()).events.map((e) => e.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('skips an invalid record and reports how many were dropped', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const database = await getHistoryDatabase()
    await database.put(EVENTS_STORE, { ...event('a'), seq: 1 })
    await database.put(EVENTS_STORE, {
      id: 'b',
      type: 'task.unknown',
      seq: 2,
    } as never)

    const { events } = await loadStoredHistory()

    expect(events.map((e) => e.id)).toEqual(['a'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('1 invalid')
  })

  it('stores the tracking start once and keeps the first value', async () => {
    const first = await ensureStoredTrackingStart(tracking)
    const second = await ensureStoredTrackingStart({
      trackingStartedAt: '2026-11-01T00:00:00.000Z',
      trackingUtcOffsetMinutes: 60,
    })

    expect(first).toEqual(tracking)
    expect(second).toEqual(tracking)
    expect((await loadStoredHistory()).trackingStart).toEqual(tracking)
  })

  it('returns events in record order, not in key order', async () => {
    // Ids sort differently from the order the events were recorded in.
    await appendStoredEvent(event('z'))
    await appendStoredEvent(event('a'))
    await appendStoredEvent(event('m'))

    expect((await loadStoredHistory()).events.map((e) => e.id)).toEqual([
      'z',
      'a',
      'm',
    ])
  })

  it('keeps appending after the last stored record', async () => {
    await appendStoredEvent(event('z'))
    await putStoredHistory([event('a'), event('b')], tracking)
    await appendStoredEvent(event('m'))

    expect((await loadStoredHistory()).events.map((e) => e.id)).toEqual([
      'z',
      'a',
      'b',
      'm',
    ])
  })

  it('stores only the known meta fields', async () => {
    await ensureStoredTrackingStart(tracking)
    const database = await getHistoryDatabase()
    const [meta] = await database.getAll('historyMeta')

    expect(Object.keys(meta).sort()).toEqual([
      'key',
      'trackingStartedAt',
      'trackingUtcOffsetMinutes',
    ])
  })

  it('replaces an invalid tracking start and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const database = await getHistoryDatabase()
    await database.put('historyMeta', {
      key: 'trackingStarted',
      trackingStartedAt: 'not-a-date',
      trackingUtcOffsetMinutes: 0,
    })

    expect((await loadStoredHistory()).trackingStart).toBeNull()
    const replaced = await ensureStoredTrackingStart(tracking)

    expect(replaced).toEqual(tracking)
    expect(warn).toHaveBeenCalledTimes(1)
    expect((await loadStoredHistory()).trackingStart).toEqual(tracking)
  })
})
