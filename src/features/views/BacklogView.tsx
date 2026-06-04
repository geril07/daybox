import { useAppStore } from '@/app/store'
import TaskList from '@/features/tasks/TaskList'
import EmptyState from '@/shared/EmptyState'

export default function BacklogView() {
  const tasks = useAppStore((s) => s.tasks)
  const backlogTasks = tasks
    .filter((t) => t.date === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (backlogTasks.length === 0) {
    return (
      <EmptyState
        title="No unscheduled tasks."
        description="Capture whatever comes to mind."
      />
    )
  }

  return <TaskList tasks={backlogTasks} />
}
