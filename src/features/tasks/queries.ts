import type { Task } from '@/features/tasks/types'
import { isOverdue, formatDate } from '@/shared/dates'

export function selectOverdue(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.completed && t.date !== null && isOverdue(t.date))
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

export function selectTodayTasks(tasks: Task[]): Task[] {
  return selectForDate(tasks, formatDate(new Date()))
}

export function selectBacklog(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.date === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
