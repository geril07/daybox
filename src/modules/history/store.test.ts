import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { historySaveSlice } from './save/slice'
import { EVENTS_STORE, getHistoryDatabase } from './storage/db'
import { loadStoredHistory, putStoredHistory } from './storage/repository'
import {
  ensureHistoryLoaded,
  flushHistoryWrites,
  replaceHistory,
  resetHistoryForTests,
  useHistoryStore,
} from './store'
import type { HistoryEvent } from './types'

const stored = {
  trackingStartedAt: '2026-01-01T00:00:00.000Z',
  trackingUtcOffsetMinutes: 180,
}

const completedEvent: HistoryEvent = {
  id: 'stored-1',
  type: 'task.completed',
  at: '2026-10-28T10:00:00.000Z',
  utcOffsetMinutes: 180,
  taskId: 't1',
  title: 'Write report',
  groupId: 'work',
  groupName: 'Work',
  date: '2026-10-28',
}

const focusEvent: HistoryEvent = {
  id: 'e1',
  type: 'focus.ended',
  at: '2026-10-28T10:00:00.000Z',
  utcOffsetMinutes: 180,
  taskId: null,
  groupId: null,
  groupName: null,
  outcome: 'completed',
  plannedMs: 1_500_000,
  focusedMs: 1_500_000,
}

async function freshStorage() {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
  localStorage.clear()
  resetHistoryForTests()
  await ensureHistoryLoaded()
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await freshStorage()
})

describe('History Store', () => {
  it('appends events in record order with identity and time', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180)
    const { recordEvent } = useHistoryStore.getState()

    recordEvent({ type: 'task.uncompleted', taskId: 't1' })
    recordEvent({
      type: 'task.rescheduled',
      taskId: 't1',
      from: '2026-10-28',
      to: null,
    })

    const events = useHistoryStore.getState().events
    expect(events.map((e) => e.type)).toEqual([
      'task.uncompleted',
      'task.rescheduled',
    ])
    expect(events[0].id).not.toBe(events[1].id)
    expect(events[0].utcOffsetMinutes).toBe(180)
    expect(Number.isNaN(Date.parse(events[0].at))).toBe(false)
  })

  it('stores a zero offset for UTC', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)
    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't1' })
    expect(
      Object.is(useHistoryStore.getState().events[0].utcOffsetMinutes, 0),
    ).toBe(true)
  })

  it('stamps an event with the given occurrence time and its offset', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120)
    const occurredAt = new Date('2026-10-28T07:25:00.000Z')

    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't1' }, occurredAt)

    expect(useHistoryStore.getState().events[0]).toMatchObject({
      at: '2026-10-28T07:25:00.000Z',
      utcOffsetMinutes: 120,
    })
  })

  it('writes exactly one stored record per event', async () => {
    await putStoredHistory([completedEvent], stored)
    const { recordEvent } = useHistoryStore.getState()

    recordEvent({ type: 'task.uncompleted', taskId: 't1' })
    recordEvent({ type: 'task.uncompleted', taskId: 't2' })
    await flushHistoryWrites()

    const { events } = await loadStoredHistory()
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.type).sort()).toEqual([
      'task.completed',
      'task.uncompleted',
      'task.uncompleted',
    ])
    // The already stored record was not rewritten by the new events.
    expect(events.find((e) => e.id === completedEvent.id)).toEqual(
      completedEvent,
    )
  })

  it('stores the tracking start on the first load', async () => {
    const { trackingStartedAt, trackingUtcOffsetMinutes } =
      useHistoryStore.getState()
    const { trackingStart } = await loadStoredHistory()

    expect(trackingStart).toEqual({
      trackingStartedAt,
      trackingUtcOffsetMinutes,
    })
  })

  it('keeps the stored tracking start on a later load', async () => {
    await putStoredHistory([], {
      trackingStartedAt: '2026-01-01T00:00:00.000Z',
      trackingUtcOffsetMinutes: 180,
    })
    resetHistoryForTests()
    await ensureHistoryLoaded()

    expect(useHistoryStore.getState().trackingStartedAt).toBe(
      '2026-01-01T00:00:00.000Z',
    )
  })

  it('keeps events recorded before the load finished', async () => {
    await putStoredHistory([completedEvent], stored)
    resetHistoryForTests()

    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't2' })
    await ensureHistoryLoaded()

    expect(useHistoryStore.getState().events.map((e) => e.id)).toEqual([
      'stored-1',
      useHistoryStore.getState().events[1].id,
    ])
    expect(useHistoryStore.getState().events).toHaveLength(2)
  })

  it('drops an invalid stored record and keeps the valid ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const database = await getHistoryDatabase()
    await database.put(EVENTS_STORE, completedEvent)
    await database.put(EVENTS_STORE, {
      id: 'broken',
      type: 'task.unknown',
    } as never)

    resetHistoryForTests()
    await ensureHistoryLoaded()

    expect(useHistoryStore.getState().events).toEqual([completedEvent])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('ignores stored events once an import replaced the history', async () => {
    await putStoredHistory([completedEvent], stored)
    resetHistoryForTests()

    replaceHistory({
      trackingStartedAt: '2026-11-01T00:00:00.000Z',
      trackingUtcOffsetMinutes: 60,
      events: [focusEvent],
    })
    await ensureHistoryLoaded()

    expect(useHistoryStore.getState().events).toEqual([focusEvent])
  })

  it('warns once when IndexedDB is unavailable and keeps events in memory', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('indexedDB', {
      open() {
        throw new Error('storage disabled')
      },
    })
    resetHistoryForTests()
    await ensureHistoryLoaded()

    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't1' })
    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't2' })
    await flushHistoryWrites()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(useHistoryStore.getState().events).toHaveLength(2)
  })
})

describe('history save slice', () => {
  const track = { version: 1, ...stored } as const

  it('accepts a valid event list', () => {
    const result = historySaveSlice.prepareImport({
      ...track,
      events: [focusEvent],
    })
    expect(result).toEqual({
      ok: true,
      value: { ...track, events: [focusEvent] },
    })
  })

  it('rejects an unknown event type', () => {
    const result = historySaveSlice.prepareImport({
      ...track,
      events: [{ ...focusEvent, type: 'task.archived' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/^history\./)
  })

  it('rejects an offset outside the real UTC range', () => {
    const result = historySaveSlice.prepareImport({
      ...track,
      events: [{ ...focusEvent, utcOffsetMinutes: 900 }],
    })
    expect(result.ok).toBe(false)
  })

  it('starts tracking at import time when the slice is missing', () => {
    const before = Date.now()
    const missing = historySaveSlice.missing
    if (missing.kind !== 'useDefault') throw new Error('expected a default')

    expect(missing.defaultValue.events).toEqual([])
    expect(
      Date.parse(missing.defaultValue.trackingStartedAt),
    ).toBeGreaterThanOrEqual(before)
  })

  it('rejects duplicate event ids', () => {
    const result = historySaveSlice.prepareImport({
      ...track,
      events: [focusEvent, { ...focusEvent }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Duplicate event id "e1"')
  })

  it('replaces both memory and storage on apply', async () => {
    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 'local' })

    historySaveSlice.applyImport({ ...track, events: [focusEvent] })
    expect(useHistoryStore.getState()).toMatchObject({
      trackingStartedAt: track.trackingStartedAt,
      trackingUtcOffsetMinutes: track.trackingUtcOffsetMinutes,
      events: [focusEvent],
    })

    await flushHistoryWrites()
    const persisted = await loadStoredHistory()
    expect(persisted.events).toEqual([focusEvent])
    expect(persisted.trackingStart).toEqual(stored)
  })
})
