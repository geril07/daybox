import { parseDate } from '@/shared/dates'

import type { Task, Series } from './types'

export const PINNED_SORT_ORDER_BASE = 1_000_000

export function seriesMatchesDate(series: Series, date: string): boolean {
  return (
    series.weekdays.includes(parseDate(date).getDay()) &&
    !series.skipDates.includes(date)
  )
}

export function planOccurrences(
  series: Series[],
  tasks: Task[],
  horizon: string[],
): Omit<Task, 'id' | 'createdAt'>[] {
  const existing = new Set(
    tasks.map((task) => JSON.stringify([task.seriesId, task.occurrenceDate])),
  )
  const planned: Omit<Task, 'id' | 'createdAt'>[] = []
  const ordered = [...series].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const date of horizon) {
    for (const item of ordered) {
      const key = JSON.stringify([item.id, date])
      if (!item.active || !seriesMatchesDate(item, date) || existing.has(key))
        continue
      existing.add(key)
      planned.push({
        title: item.title,
        groupId: item.groupId,
        pomoEstimate: item.pomoEstimate,
        date,
        occurrenceDate: date,
        seriesId: item.id,
        pomoCompleted: 0,
        completed: false,
        completedAt: null,
        sortOrder: PINNED_SORT_ORDER_BASE + planned.length,
      })
    }
  }
  return planned
}

export function compactBucket(tasks: Task[], date: string | null): Task[] {
  const bucket: Task[] = []
  for (const t of tasks) {
    if (t.date === date) {
      bucket.push(t)
    }
  }

  const sorted = [...bucket].sort((a, b) => {
    const diff = a.sortOrder - b.sortOrder
    if (diff !== 0) return diff
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const compactedMap = new Map<string, Task>()
  sorted.forEach((t, i) => {
    compactedMap.set(t.id, { ...t, sortOrder: i })
  })

  return tasks.map((t) =>
    t.date === date && compactedMap.has(t.id) ? compactedMap.get(t.id)! : t,
  )
}

export function nextSortOrder(tasks: Task[], date: string | null): number {
  let max = -1
  for (const t of tasks) {
    if (t.date === date && t.sortOrder > max) {
      max = t.sortOrder
    }
  }
  return max + 1
}

export function compactAllBuckets(tasks: Task[]): Task[] {
  const dates = [...new Set(tasks.map((t) => t.date))]
  return dates.reduce((acc, date) => compactBucket(acc, date), tasks)
}
