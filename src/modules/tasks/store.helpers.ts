import type { Task } from './types'

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
