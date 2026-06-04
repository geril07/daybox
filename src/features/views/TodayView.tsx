import { useAppStore } from '../../app/store'
import EmptyState from '../../shared/EmptyState'
import { isOverdue, formatDate } from '../../shared/dates'
import AddTaskRow from '../tasks/AddTaskRow'
import TaskList from '../tasks/TaskList'

export default function TodayView() {
  const tasks = useAppStore((s) => s.tasks)
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
      <>
        <AddTaskRow defaultDate={today} />
        <EmptyState
          title="Nothing scheduled for today"
          description="Pull tasks from Backlog or add a new one."
        />
      </>
    )
  }

  return (
    <div>
      {overdueTasks.length > 0 && (
        <div>
          <div
            className="section-label pt-5 pb-2 text-[10.5px] font-semibold tracking-[0.9px] uppercase"
            style={{ color: 'var(--overdue)' }}
          >
            Overdue
          </div>
          <TaskList tasks={overdueTasks} showAddRow={false} />
        </div>
      )}
      <div
        className="section-label pt-5 pb-2 text-[10.5px] font-semibold tracking-[0.9px] uppercase"
        style={{ color: 'var(--fg-3)' }}
      >
        Today
      </div>
      <TaskList tasks={todayTasks} defaultDate={today} />
    </div>
  )
}
