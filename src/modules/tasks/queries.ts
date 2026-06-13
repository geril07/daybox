import type { Task } from './types'

export function selectOverdue(tasks: Task[], asOf: string): Task[] {
  return tasks
    .filter((t) => !t.completed && t.date !== null && t.date < asOf)
    .sort((a, b) => {
      if (a.date! < b.date!) return -1
      if (a.date! > b.date!) return 1
      return a.sortOrder - b.sortOrder
    })
}

export function selectForDate(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function selectInRange(
  tasks: Task[],
  start: string,
  end: string,
): Task[] {
  return tasks
    .filter((t) => t.date !== null && t.date >= start && t.date <= end)
    .sort((a, b) => {
      if (a.date! < b.date!) return -1
      if (a.date! > b.date!) return 1
      return a.sortOrder - b.sortOrder
    })
}

export function selectUndated(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.date === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
