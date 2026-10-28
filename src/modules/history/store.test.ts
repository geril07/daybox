import { describe, it, expect, beforeEach, vi } from 'vitest'

import { historySaveSlice } from './save/slice'
import { HISTORY_STORAGE_KEY, useHistoryStore } from './store'

beforeEach(() => {
  localStorage.clear()
  useHistoryStore.setState({ events: [] })
  vi.restoreAllMocks()
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

  it('persists the tracking start on first launch without events', async () => {
    localStorage.clear()
    vi.resetModules()
    const { useHistoryStore: fresh } = await import('./store')

    const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!)
    expect(stored.state.trackingStartedAt).toBe(
      fresh.getState().trackingStartedAt,
    )
    expect(stored.state.events).toEqual([])
  })

  it('keeps the stored tracking start on a later launch', async () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({
        state: {
          trackingStartedAt: '2026-01-01T00:00:00.000Z',
          trackingUtcOffsetMinutes: 180,
          events: [],
        },
        version: 0,
      }),
    )
    vi.resetModules()
    const { useHistoryStore: fresh } = await import('./store')

    expect(fresh.getState().trackingStartedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('restores persisted events on rehydrate', async () => {
    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 't1' })
    const persisted = useHistoryStore.getState().events
    const stored = localStorage.getItem('daybox-history')

    useHistoryStore.setState({ events: [] })
    localStorage.setItem('daybox-history', stored!)
    await useHistoryStore.persist.rehydrate()

    expect(useHistoryStore.getState().events).toEqual(persisted)
  })

  it('resets to an empty list when the persisted blob is invalid', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(
      'daybox-history',
      JSON.stringify({
        state: { events: [{ id: 'e1', type: 'task.unknown' }] },
        version: 0,
      }),
    )

    await useHistoryStore.persist.rehydrate()

    expect(useHistoryStore.getState().events).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('history save slice', () => {
  const event = {
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
  } as const
  const tracking = {
    version: 1,
    trackingStartedAt: '2026-10-01T00:00:00.000Z',
    trackingUtcOffsetMinutes: 180,
  } as const

  it('accepts a valid event list', () => {
    const result = historySaveSlice.prepareImport({
      ...tracking,
      events: [event],
    })
    expect(result).toEqual({
      ok: true,
      value: { ...tracking, events: [event] },
    })
  })

  it('rejects an unknown event type', () => {
    const result = historySaveSlice.prepareImport({
      ...tracking,
      events: [{ ...event, type: 'task.archived' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/^history\./)
  })

  it('rejects an offset outside the real UTC range', () => {
    const result = historySaveSlice.prepareImport({
      ...tracking,
      events: [{ ...event, utcOffsetMinutes: 900 }],
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
      ...tracking,
      events: [event, { ...event }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Duplicate event id "e1"')
  })

  it('replaces local history on apply', () => {
    useHistoryStore
      .getState()
      .recordEvent({ type: 'task.uncompleted', taskId: 'local' })
    historySaveSlice.applyImport({ ...tracking, events: [event] })
    expect(useHistoryStore.getState()).toMatchObject({
      trackingStartedAt: tracking.trackingStartedAt,
      trackingUtcOffsetMinutes: tracking.trackingUtcOffsetMinutes,
      events: [event],
    })
  })
})
