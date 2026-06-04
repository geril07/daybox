import TaskList from '@/features/tasks/TaskList'
import { useTaskStore } from '@/features/tasks/store'
import EmptyState from '@/shared/EmptyState'
import { isOverdue, formatDate } from '@/shared/dates'

export default function TodayView() {
  const tasks = useTaskStore((s) => s.tasks)
  const today = formatDate(new Date())

  const overdueTasks = tasks
    .filter((t) => !t.completed && t.date !== null && isOverdue(t.date))
    .sort((a, b) => {
      if (a.date! < b.date!) return -1
      if (a.date! > b.date!) return 1
      return a.sortOrder - b.sortOrder
    })

  const todayTasks = tasks
    .filter((t) => t.date === today)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (overdueTasks.length === 0 && todayTasks.length === 0) {
    return (
      <EmptyState
        title="Nothing scheduled for today"
        description="Pull tasks from Backlog or add a new one."
      />
    )
  }

  return (
    <div>
      {overdueTasks.length > 0 && (
        <div>
          <div className="section-label text-destructive pt-5 pb-2 text-[10.5px] font-semibold tracking-[0.9px] uppercase">
            Overdue
          </div>
          <TaskList tasks={overdueTasks} />
        </div>
      )}
      <div className="section-label text-muted-foreground pt-5 pb-2 text-[10.5px] font-semibold tracking-[0.9px] uppercase">
        Today
      </div>
      <TaskList tasks={todayTasks} />
    </div>
  )
}
