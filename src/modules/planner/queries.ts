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

export type View = 'today' | 'tomorrow' | 'week' | 'unscheduled' | 'date'

export type TaskRange =
  | { kind: 'date'; date: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'undated' }

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
