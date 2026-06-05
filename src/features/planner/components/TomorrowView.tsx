import { TaskList, selectForDate, useTaskStore } from '@/features/tasks'
import { formatDate, getTomorrow } from '@/shared/dates'
import { EmptyState } from '@/shared/ui'

export function TomorrowView() {
  const tasks = useTaskStore((s) => s.tasks)
  const tomorrow = formatDate(getTomorrow())
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
