import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlannerStore } from '@/modules/planner'
import { useTimerStore } from '@/modules/timer'
import { getDateRange, getWeekEndDate } from '@/shared/dates'

import { selectOverdue } from './queries'
import { TaskV1Schema } from './schema/v1'
import { useTaskStore } from './store'
import { planOccurrences, seriesMatchesDate } from './store.helpers'
import type { Series } from './types'

const today = '2026-10-06'
const template: Series = {
  id: 's1',
  title: 'Work',
  groupId: 'default',
  pomoEstimate: 1.5,
  weekdays: [1, 2, 3, 4, 5],
  active: true,
  skipDates: [],
  sortOrder: 0,
  createdAt: '2026-10-06T00:00:00.000Z',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 6, 12))
  usePlannerStore.setState({ dayStartMinutes: 0 })
  useTaskStore.setState({ tasks: [], series: [] })
  useTimerStore.getState().setFocusedTaskId(null)
})

afterEach(() => vi.useRealTimers())

describe('occurrence planning', () => {
  it('respects both week boundaries and includes only the horizon', () => {
    expect(getWeekEndDate(today, 1)).toBe('2026-10-11')
    expect(getWeekEndDate(today, 0)).toBe('2026-10-10')
    const horizon = getDateRange(today, getWeekEndDate(today, 1))
    expect(horizon).toHaveLength(6)
    expect(
      planOccurrences([template], [], horizon).map((task) => task.date),
    ).toEqual(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
  })
  it('checks weekdays, skips and active state', () => {
    expect(seriesMatchesDate(template, today)).toBe(true)
    expect(seriesMatchesDate(template, '2026-10-10')).toBe(false)
    expect(seriesMatchesDate({ ...template, skipDates: [today] }, today)).toBe(
      false,
    )
    expect(
      planOccurrences([{ ...template, active: false }], [], [today]),
    ).toEqual([])
    expect(planOccurrences([template], [], [])).toEqual([])
  })
  it('does not recreate rescheduled occurrences', () => {
    const planned = planOccurrences([template], [], [today])[0]
    const task = {
      ...planned,
      id: 't1',
      createdAt: template.createdAt,
      date: '2026-10-07',
    }
    expect(planOccurrences([template], [task], [today])).toEqual([])
  })
})

describe('recurrence store', () => {
  it('generates once, does not backfill, and compacts every horizon bucket', () => {
    const store = useTaskStore.getState()
    store.addSeries({ title: 'Daily', weekdays: [0, 1, 2, 3, 4, 5, 6] })
    store.addTask('Ordinary', undefined, today)
    store.ensureOccurrences(today, 1)
    const first = useTaskStore.getState().tasks
    store.ensureOccurrences(today, 1)
    expect(useTaskStore.getState().tasks).toBe(first)
    expect(first.filter((task) => task.seriesId)).toHaveLength(6)
    expect(
      first.every((task) => task.date! >= today && task.date! <= '2026-10-11'),
    ).toBe(true)
    expect(
      first.filter((task) => task.date === today).map((task) => task.sortOrder),
    ).toEqual([0, 1])
    expect(first.find((task) => task.date === '2026-10-07')?.sortOrder).toBe(0)
  })
  it('skip suppresses generation and clears focus', () => {
    useTaskStore.setState({ series: [template] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const task = useTaskStore.getState().tasks[0]
    useTimerStore.getState().setFocusedTaskId(task.id)
    store.skipOccurrence(task.id)
    store.ensureOccurrences(today, 1)
    expect(useTaskStore.getState().series[0].skipDates).toEqual([today])
    expect(
      useTaskStore
        .getState()
        .tasks.some((task) => task.occurrenceDate === today),
    ).toBe(false)
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })
  it('renames existing titles but keeps other series edits generation-only; deleting removes all occurrences', () => {
    useTaskStore.setState({ series: [template] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const original = useTaskStore.getState().tasks[0]
    store.updateSeries(template.id, {
      title: 'Changed',
      pomoEstimate: 3,
      weekdays: [1],
    })
    expect(useTaskStore.getState().tasks[0]).toEqual({
      ...original,
      title: 'Changed',
    })
    store.ensureOccurrences('2026-10-12', 1)
    expect(useTaskStore.getState().tasks.at(-1)?.title).toBe('Changed')
    store.setSeriesActive(template.id, false)
    store.ensureOccurrences('2026-10-19', 1)
    expect(useTaskStore.getState().tasks).toHaveLength(5)
    useTimerStore.getState().setFocusedTaskId(original.id)
    store.deleteSeries(template.id)
    expect(useTaskStore.getState().tasks).toEqual([])
    expect(useTaskStore.getState().series).toEqual([])
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })
  it('renames matching upcoming unfinished tasks and preserves exceptions', () => {
    useTaskStore.setState({ series: [template] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const generated = useTaskStore.getState().tasks[0]
    const tasks = [
      { ...generated, id: 'today' },
      { ...generated, id: 'future', date: '2026-10-20', pomoCompleted: 2 },
      { ...generated, id: 'past', date: '2026-10-05' },
      { ...generated, id: 'completed', completed: true },
      {
        ...generated,
        id: 'completed-future',
        date: '2026-10-20',
        completed: true,
      },
      { ...generated, id: 'custom', title: 'Work with Alex' },
      { ...generated, id: 'stale', title: 'Older title' },
      { ...generated, id: 'later', date: null },
      { ...generated, id: 'other-series', seriesId: 's2' },
      { ...generated, id: 'ordinary', seriesId: null, occurrenceDate: null },
    ]
    useTaskStore.setState({ tasks })

    store.updateSeries(template.id, { title: '  Job  ' })

    expect(useTaskStore.getState().series[0].title).toBe('Job')
    expect(useTaskStore.getState().tasks).toEqual([
      { ...tasks[0], title: 'Job' },
      { ...tasks[1], title: 'Job' },
      ...tasks.slice(2),
    ])
    store.updateSeries(template.id, { title: 'Career' })
    expect(useTaskStore.getState().tasks).toEqual([
      { ...tasks[0], title: 'Career' },
      { ...tasks[1], title: 'Career' },
      ...tasks.slice(2),
    ])
  })
  it('uses current scheduled dates and the configured planner day boundary', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2))
    usePlannerStore.setState({ dayStartMinutes: 180 })
    useTaskStore.setState({ series: [template] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const generated = useTaskStore.getState().tasks[0]
    const movedPast = { ...generated, id: 'moved-past', date: '2026-10-05' }
    const movedFuture = {
      ...generated,
      id: 'moved-future',
      occurrenceDate: '2026-10-05',
      date: '2026-10-08',
    }
    useTaskStore.setState({ tasks: [generated, movedPast, movedFuture] })

    store.updateSeries(template.id, { title: 'Job' })

    expect(useTaskStore.getState().tasks).toEqual([
      { ...generated, title: 'Job' },
      movedPast,
      { ...movedFuture, title: 'Job' },
    ])

    vi.setSystemTime(new Date(2026, 9, 7, 3))
    store.updateSeries(template.id, { title: 'Career' })
    expect(useTaskStore.getState().tasks).toEqual([
      { ...generated, title: 'Job' },
      movedPast,
      { ...movedFuture, title: 'Career' },
    ])
  })
  it('leaves tasks unchanged for invalid, unchanged-title, and non-title updates', () => {
    useTaskStore.setState({ series: [template] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const tasks = useTaskStore.getState().tasks
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    store.updateSeries(template.id, { title: ' ' })
    store.updateSeries(template.id, { title: 'Job', weekdays: [] })
    expect(useTaskStore.getState().series[0]).toEqual(template)
    expect(useTaskStore.getState().tasks).toBe(tasks)
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()

    store.updateSeries(template.id, { title: ' Work ' })
    store.updateSeries(template.id, { pomoEstimate: 3, active: false })
    expect(useTaskStore.getState().tasks).toBe(tasks)
  })
  it('validates series creation and defaults its group', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useTaskStore.getState()
    expect(store.addSeries({ title: ' ', weekdays: [1] })).toBeNull()
    expect(
      store.addSeries({ title: 'x'.repeat(281), weekdays: [1] }),
    ).toBeNull()
    expect(store.addSeries({ title: 'Work', weekdays: [] })).toBeNull()
    expect(
      store.addSeries({ title: 'x'.repeat(280), weekdays: [1] })?.groupId,
    ).toBe('default')
    expect(warn).toHaveBeenCalledTimes(3)
    warn.mockRestore()
  })
  it('reassigns series along with tasks, including a series without occurrences', () => {
    useTaskStore.setState({ series: [{ ...template, groupId: 'work' }] })
    const store = useTaskStore.getState()
    store.reassignTasks('work', 'default')
    expect(useTaskStore.getState().series[0].groupId).toBe('default')
    store.ensureOccurrences(today, 1)
    expect(
      useTaskStore.getState().tasks.every((task) => task.groupId === 'default'),
    ).toBe(true)
  })
  it('group deletion removes its series even when an occurrence moved groups', () => {
    useTaskStore.setState({ series: [{ ...template, groupId: 'work' }] })
    const store = useTaskStore.getState()
    store.ensureOccurrences(today, 1)
    const task = useTaskStore.getState().tasks[0]
    store.updateTask(task.id, { groupId: 'default' })
    useTimerStore.getState().setFocusedTaskId(task.id)
    store.deleteTasksByGroupId('work')
    store.ensureOccurrences(today, 1)
    expect(useTaskStore.getState().tasks).toEqual([])
    expect(useTaskStore.getState().series).toEqual([])
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
  })
  it('excludes missed occurrences from overdue regardless of group', () => {
    useTaskStore.setState({
      series: [template, { ...template, id: 's2', groupId: 'work' }],
    })
    useTaskStore.getState().ensureOccurrences(today, 1)
    const ordinary = useTaskStore
      .getState()
      .addTask('Ordinary', undefined, today)!
    expect(selectOverdue(useTaskStore.getState().tasks, '2026-10-12')).toEqual([
      ordinary,
    ])
  })
  it('rehydrates legacy state and resets duplicate identity to defaults', async () => {
    useTaskStore.setState({ series: [template] })
    useTaskStore.getState().ensureOccurrences(today, 1)
    const task = useTaskStore.getState().tasks[0]
    localStorage.setItem(
      'daybox-tasks',
      JSON.stringify({
        version: 0,
        state: {
          tasks: [task, { ...task, id: 'duplicate' }],
          series: [template],
        },
      }),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await useTaskStore.persist.rehydrate()
    expect(useTaskStore.getState().tasks).toEqual([])
    expect(useTaskStore.getState().series).toEqual([])
    warn.mockRestore()
    const legacy = TaskV1Schema.parse(task)
    localStorage.setItem(
      'daybox-tasks',
      JSON.stringify({ version: 0, state: { tasks: [legacy] } }),
    )
    await useTaskStore.persist.rehydrate()
    expect(useTaskStore.getState().tasks[0].seriesId).toBeNull()
    expect(useTaskStore.getState().series).toEqual([])
  })
})
