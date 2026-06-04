import { useSettingsStore } from '@/app/settingsStore'
import { TaskList, selectForDate, useTaskStore } from '@/features/tasks'
import { EmptyState } from '@/shared/EmptyState'
import { getWeekDays, getFormattedDate, formatDate } from '@/shared/dates'

export function WeekView() {
  const weekStartDay = useSettingsStore((s) => s.settings.weekStartDay)
  const tasks = useTaskStore((s) => s.tasks)

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
        const dayTasks = selectForDate(tasks, dateStr)

        if (dayTasks.length === 0) return null

        const isToday = dateStr === today

        return (
          <div key={dateStr} className="mb-2">
            <div className="text-fg-2 flex items-center gap-2 px-1.5 py-2 text-xs font-semibold">
              {getFormattedDate(day)}
              {isToday && (
                <span className="text-accent bg-accent-bg border-accent-border rounded-full border px-[7px] py-[1px] text-xs font-medium">
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
