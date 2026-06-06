import { TaskList } from '@/features/tasks'
import { EmptyState } from '@/shared/ui'

import { viewMetaMap, useFilteredTasks } from '../queries'
import { SectionHeader } from './SectionHeader'

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
          <SectionHeader label="Overdue" tone="destructive" />
          <TaskList tasks={overdue} />
        </div>
      )}
      <SectionHeader label={meta.title} />
      <TaskList tasks={tasks} />
    </div>
  )
}
