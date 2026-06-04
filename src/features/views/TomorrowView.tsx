import { useAppStore } from '../../app/store'
import EmptyState from '../../shared/EmptyState'
import { formatDate } from '../../shared/dates'
import TaskList from '../tasks/TaskList'

export default function TomorrowView() {
  const tasks = useAppStore((s) => s.tasks)
  const tomorrow = formatDate(new Date(Date.now() + 86400000))
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
      <TaskList tasks={tomorrowTasks} defaultDate={tomorrow} />
    </div>
  )
}
