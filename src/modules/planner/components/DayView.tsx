import { LayoutGroup } from 'motion/react'

import { TaskList } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'

import { viewMetaMap, useFilteredTasks, filterByGroup } from '../queries'
import { SectionHeader } from './SectionHeader'

type SingleDayView = 'today' | 'tomorrow' | 'unscheduled'

interface DayViewProps {
  view: SingleDayView
  selectedGroupId?: string | null
}

export function DayView({ view, selectedGroupId = null }: DayViewProps) {
  const { tasks, overdue, bucketDate } = useFilteredTasks(view)
  const meta = viewMetaMap[view]

  const filteredTasks = filterByGroup(tasks, selectedGroupId)
  const filteredOverdue = filterByGroup(overdue, selectedGroupId)

  const hasContent = filteredTasks.length > 0 || filteredOverdue.length > 0

  if (!hasContent) {
    return (
      <EmptyState title={meta.emptyTitle} description={meta.emptyDescription} />
    )
  }

  const isSortable = selectedGroupId === null

  return (
    <LayoutGroup id="planner-day">
      {filteredOverdue.length > 0 && (
        <div>
          <SectionHeader label="Overdue" tone="destructive" />
          <TaskList tasks={filteredOverdue} />
        </div>
      )}
      <SectionHeader label={meta.title} />
      <TaskList tasks={filteredTasks} date={bucketDate} sortable={isSortable} />
    </LayoutGroup>
  )
}
