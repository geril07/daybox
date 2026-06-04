import TaskList from '@/features/tasks/TaskList'
import { useTaskStore } from '@/features/tasks/store'
import EmptyState from '@/shared/EmptyState'
import { formatDate } from '@/shared/dates'

const tomorrowTimestamp = Date.now() + 86400000

export default function TomorrowView() {
  const tasks = useTaskStore((s) => s.tasks)
  const tomorrow = formatDate(new Date(tomorrowTimestamp))
  const tomorrowTasks = tasks
    .filter((t) => t.date === tomorrow)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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
