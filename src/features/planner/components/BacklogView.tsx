import TaskList from '@/features/tasks/components/TaskList'
import { selectBacklog } from '@/features/tasks/queries'
import { useTaskStore } from '@/features/tasks/store'
import EmptyState from '@/shared/EmptyState'

export default function BacklogView() {
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
