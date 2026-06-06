import { TaskList } from '@/features/tasks'
import { EmptyState } from '@/shared/ui'

import { viewMetaMap, useFilteredTasks } from '../queries'

type SingleDayView = 'today' | 'tomorrow' | 'backlog'

interface DayViewProps {
  view: SingleDayView
}

export function DayView({ view }: DayViewProps) {
  const { tasks, overdue } = useFilteredTasks(view)
  const meta = viewMetaMap[view]

  const hasContent = tasks.length > 0 || overdue.length > 0

  if (!hasContent) {
    return (
      <EmptyState title={meta.emptyTitle} description={meta.emptyDescription} />
    )
  }

  return (
    <div>
      {overdue.length > 0 && (
        <div>
          <div className="section-label text-destructive pt-5 pb-2 text-xs font-semibold tracking-widest uppercase">
            Overdue
          </div>
          <TaskList tasks={overdue} />
        </div>
      )}
      {view === 'today' && (
        <div className="section-label text-muted-foreground pt-5 pb-2 text-xs font-semibold tracking-widest uppercase">
          Today
        </div>
      )}
      <TaskList tasks={tasks} />
    </div>
  )
}
