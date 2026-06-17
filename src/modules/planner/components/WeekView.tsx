import { TaskList } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'

import { useWeekSections, filterByGroup } from '../queries'
import { SectionHeader } from './SectionHeader'

interface WeekViewProps {
  selectedGroupId?: string | null
}

export function WeekView({ selectedGroupId = null }: WeekViewProps) {
  const sections = useWeekSections()

  const filtered = sections
    .map((s) => ({
      ...s,
      tasks: filterByGroup(s.tasks, selectedGroupId),
    }))
    .filter((s) => s.tasks.length > 0 || s.emptyHint)

  const hasContent = filtered.some((s) => s.tasks.length > 0)

  if (!hasContent) {
    return (
      <EmptyState
        title="No tasks this week."
        description="Add or reschedule something."
      />
    )
  }

  return (
    <>
      {filtered.map((section) => (
        <div key={section.key} className="mb-2">
          <SectionHeader label={section.label} tone={section.tone} />
          {section.tasks.length > 0 ? (
            <TaskList tasks={section.tasks} date={section.date} />
          ) : (
            <div className="text-muted-foreground px-1.5 py-2 text-xs">
              {section.emptyHint}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
