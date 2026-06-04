import { TaskList, selectBacklog, useTaskStore } from '@/features/tasks'
import { EmptyState } from '@/shared/EmptyState'

export function BacklogView() {
  const tasks = useTaskStore((s) => s.tasks)
  const backlogTasks = selectBacklog(tasks)

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
