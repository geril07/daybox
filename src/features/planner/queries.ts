import { useMemo } from 'react'

import {
  selectForDate,
  selectInRange,
  selectUndated,
  selectOverdue,
  useTaskStore,
} from '@/features/tasks'
import { formatDate, getWeekDays } from '@/shared/dates'

import { usePlannerStore } from './store'

export type View = 'today' | 'tomorrow' | 'week' | 'backlog' | 'date'

export type TaskRange =
  | { kind: 'date'; date: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'undated' }

export type DayViewMeta = {
  title: string
  emptyTitle: string
  emptyDescription: string
}

export const viewMetaMap: Record<
  Exclude<View, 'week' | 'date'>,
  DayViewMeta
> = {
  today: {
    title: 'Today',
    emptyTitle: 'Nothing scheduled for today',
    emptyDescription: 'Pull tasks from Backlog or add a new one.',
  },
  tomorrow: {
    title: 'Tomorrow',
    emptyTitle: 'Nothing planned for tomorrow yet.',
    emptyDescription: 'Add a task or reschedule one from today.',
  },
  backlog: {
    title: 'Backlog',
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
    case 'backlog':
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

    switch (range.kind) {
      case 'date':
        filtered = selectForDate(tasks, range.date)
        break
      case 'range':
        filtered = selectInRange(tasks, range.start, range.end)
        break
      case 'undated':
        filtered = selectUndated(tasks)
        break
    }

    if (view === 'today') {
      overdue = selectOverdue(tasks, today)
    }

    return { tasks: filtered, overdue }
  }, [tasks, view, weekStartDay])
}
