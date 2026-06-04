import {
  TaskList,
  selectOverdue,
  selectTodayTasks,
  useTaskStore,
} from '@/features/tasks'
import EmptyState from '@/shared/EmptyState'

export function TodayView() {
  const tasks = useTaskStore((s) => s.tasks)

  const overdueTasks = selectOverdue(tasks)
  const todayTasks = selectTodayTasks(tasks)

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
