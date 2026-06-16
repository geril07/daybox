import { useMemo } from 'react'

import {
  selectForDate,
  selectInRange,
  selectUndated,
  selectOverdue,
  useTaskStore,
  type Task,
} from '@/modules/tasks'
import { formatDate, getWeekDays, getWeekSectionLabel } from '@/shared/dates'

import { usePlannerStore } from './store'

export type View = 'today' | 'tomorrow' | 'week' | 'unscheduled' | 'later' | 'date'

export type TaskRange =
  | { kind: 'date'; date: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'undated' }
  | { kind: 'after'; start: string }

export type DayViewMeta = {
  title: string
  emptyTitle: string
  emptyDescription: string
}

export type SectionTone = 'default' | 'destructive'

export type Section = {
  key: string
  label: string
  tone?: SectionTone
  tasks: Task[]
  emptyHint?: string
  date?: string | null
}

export const viewMetaMap: Record<
  Exclude<View, 'week' | 'date'>,
  DayViewMeta
> = {
  today: {
    title: 'Today',
    emptyTitle: 'Nothing scheduled for today',
    emptyDescription: 'Pull unscheduled tasks or add a new one.',
  },
  tomorrow: {
    title: 'Tomorrow',
    emptyTitle: 'Nothing planned for tomorrow yet.',
    emptyDescription: 'Add a task or reschedule one from today.',
  },
  unscheduled: {
    title: 'Unscheduled',
    emptyTitle: 'No unscheduled tasks.',
    emptyDescription: 'Capture whatever comes to mind.',
  },
  later: {
    title: 'Later',
    emptyTitle: 'Nothing planned for later.',
    emptyDescription:
      'Add a task with a date after this week to see it here.',
  },
}

export function viewToRange(
  view: View,
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  today: string,
): TaskRange {
  switch (view) {
    case 'today':
      return { kind: 'date', date: today }
    case 'tomorrow': {
      const [y, m, day] = today.split('-').map(Number)
      const tomorrowDate = new Date(y, m - 1, day + 1)
      return { kind: 'date', date: formatDate(tomorrowDate) }
    }
    case 'week': {
      const days = getWeekDays(weekStartDay)
      return {
        kind: 'range',
        start: formatDate(days[0]),
        end: formatDate(days[6]),
      }
    }
    case 'unscheduled':
      return { kind: 'undated' }
    case 'later': {
      const days = getWeekDays(weekStartDay)
      const lastDay = days[6]
      const firstAfter = new Date(lastDay)
      firstAfter.setDate(lastDay.getDate() + 1)
      return { kind: 'after', start: formatDate(firstAfter) }
    }
    case 'date':
      return { kind: 'date', date: today }
  }
}

export function useFilteredTasks(view: View) {
  const tasks = useTaskStore((s) => s.tasks)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)

  return useMemo(() => {
    const today = formatDate(new Date())
    const range = viewToRange(view, weekStartDay, today)

    let filtered: typeof tasks
    let overdue: typeof tasks = []
    let bucketDate: string | null | undefined

    switch (range.kind) {
      case 'date':
        filtered = selectForDate(tasks, range.date)
        bucketDate = range.date
        break
      case 'range':
        filtered = selectInRange(tasks, range.start, range.end)
        bucketDate = undefined
        break
      case 'undated':
        filtered = selectUndated(tasks)
        bucketDate = null
        break
      case 'after':
        filtered = tasks
          .filter((t) => t.date !== null && t.date >= range.start)
          .sort((a, b) => {
            if (a.date! < b.date!) return -1
            if (a.date! > b.date!) return 1
            return a.sortOrder - b.sortOrder
          })
        bucketDate = null
        break
    }

    if (view === 'today') {
      overdue = selectOverdue(tasks, today)
    }

    return { tasks: filtered, overdue, bucketDate }
  }, [tasks, view, weekStartDay])
}

export function defaultDateForView(
  view: View,
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  browseDate?: string | null,
): string | undefined {
  if (view === 'date') return browseDate ?? undefined

  const today = formatDate(new Date())
  const range = viewToRange(view, weekStartDay, today)

  switch (range.kind) {
    case 'date':
      return range.date
    case 'range':
      return today
    case 'undated':
      return undefined
    case 'after':
      return range.start
  }
}

export function useWeekSections(): Section[] {
  const tasks = useTaskStore((s) => s.tasks)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)

  return useMemo(() => {
    const today = formatDate(new Date())
    const sections: Section[] = []

    const overdue = selectOverdue(tasks, today)
    if (overdue.length > 0) {
      sections.push({
        key: 'overdue',
        label: 'Overdue',
        tone: 'destructive',
        tasks: overdue,
      })
    }

    for (const day of getWeekDays(weekStartDay)) {
      const dateStr = formatDate(day)
      if (dateStr < today) continue

      sections.push({
        key: dateStr,
        label: getWeekSectionLabel(day),
        tasks: selectForDate(tasks, dateStr),
        emptyHint: 'Nothing planned',
        date: dateStr,
      })
    }

    return sections
  }, [tasks, weekStartDay])
}

export function filterByGroup(
  tasks: Task[],
  groupId: string | null,
): Task[] {
  if (groupId === null) return tasks
  return tasks.filter((t) => t.groupId === groupId)
}

export function useLaterSections(): Section[] {
  const tasks = useTaskStore((s) => s.tasks)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)

  return useMemo(() => {
    const days = getWeekDays(weekStartDay)
    const lastDay = days[6]
    const firstAfter = new Date(lastDay)
    firstAfter.setDate(lastDay.getDate() + 1)
    const start = formatDate(firstAfter)

    const byDate = new Map<string, Task[]>()
    for (const task of tasks) {
      if (task.date === null || task.date < start) continue
      const list = byDate.get(task.date) || []
      list.push(task)
      byDate.set(task.date, list)
    }

    const sortedDates = Array.from(byDate.keys()).sort()

    return sortedDates.map((date) => ({
      key: date,
      label: getWeekSectionLabel(new Date(date + 'T00:00:00')),
      tasks: byDate.get(date)!.sort((a, b) => a.sortOrder - b.sortOrder),
      date,
    }))
  }, [tasks, weekStartDay])
}
