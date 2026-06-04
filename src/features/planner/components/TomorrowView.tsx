import { TaskList, selectForDate, useTaskStore } from '@/features/tasks'
import EmptyState from '@/shared/EmptyState'
import { formatDate } from '@/shared/dates'

const tomorrowTimestamp = Date.now() + 86400000

export function TomorrowView() {
  const tasks = useTaskStore((s) => s.tasks)
  const tomorrow = formatDate(new Date(tomorrowTimestamp))
  const tomorrowTasks = selectForDate(tasks, tomorrow)

  if (tomorrowTasks.length === 0) {
    return (
      <EmptyState
        title="Nothing planned for tomorrow yet."
        description="Add a task or reschedule one from today."
      />
    )
  }

  return (
    <div>
      <TaskList tasks={tomorrowTasks} />
    </div>
  )
}
