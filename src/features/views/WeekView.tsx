import { useAppStore } from '@/app/store'
import TaskList from '@/features/tasks/TaskList'
import EmptyState from '@/shared/EmptyState'
import { getWeekDays, getFormattedDate, formatDate } from '@/shared/dates'

export default function WeekView() {
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const tasks = useAppStore((s) => s.tasks)

  const days = getWeekDays(weekStartDay)
  const today = formatDate(new Date())

  const hasAnyTasks = days.some((day) => {
    const dateStr = formatDate(day)
    return tasks.some((t) => !t.completed && t.date === dateStr)
  })

  if (!hasAnyTasks) {
    return (
      <EmptyState
        title="No tasks this week."
        description="Add or reschedule something."
      />
    )
  }

  return (
    <div>
      {days.map((day) => {
        const dateStr = formatDate(day)
        const dayTasks = tasks
          .filter((t) => t.date === dateStr)
          .sort((a, b) => a.sortOrder - b.sortOrder)

        if (dayTasks.length === 0) return null

        const isToday = dateStr === today

        return (
          <div key={dateStr} className="mb-2">
            <div
              className="flex items-center gap-2 px-1.5 py-2 text-xs font-semibold"
              style={{ color: 'var(--fg-2)' }}
            >
              {getFormattedDate(day)}
              {isToday && (
                <span
                  className="text-accent rounded-full px-[7px] py-[1px] text-xs font-medium"
                  style={{
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  TODAY
                </span>
              )}
            </div>
            <TaskList tasks={dayTasks} />
          </div>
        )
      })}
    </div>
  )
}
