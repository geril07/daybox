import { LayoutGroup } from 'motion/react'

import { TaskList } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'

import { useWeekSections } from '../queries'
import { SectionHeader } from './SectionHeader'

export function WeekView() {
  const sections = useWeekSections()

  const hasContent = sections.some((s) => s.tasks.length > 0)

  if (!hasContent) {
    return (
      <EmptyState
        title="No tasks this week."
        description="Add or reschedule something."
      />
    )
  }

  return (
    <LayoutGroup id="planner-week">
      {sections.map((section) => (
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
    </LayoutGroup>
  )
}
