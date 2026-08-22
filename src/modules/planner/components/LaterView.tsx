import { TaskList } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'

import { useLaterSections, viewMetaMap, filterByGroup } from '../queries'
import { usePlannerStore } from '../store'
import { SectionHeader } from './SectionHeader'

interface LaterViewProps {
  selectedGroupId?: string | null
}

export function LaterView({ selectedGroupId = null }: LaterViewProps) {
  const sections = useLaterSections()
  const dayStartMinutes = usePlannerStore((s) => s.dayStartMinutes)
  const meta = viewMetaMap.later

  const filtered = sections
    .map((s) => ({
      ...s,
      tasks: filterByGroup(s.tasks, selectedGroupId),
    }))
    .filter((s) => s.tasks.length > 0)

  const hasContent = filtered.length > 0

  if (!hasContent) {
    return (
      <EmptyState title={meta.emptyTitle} description={meta.emptyDescription} />
    )
  }

  return (
    <>
      {filtered.map((section) => (
        <div key={section.key} className="mb-2">
          <SectionHeader label={section.label} />
          <TaskList
            tasks={section.tasks}
            date={section.date}
            dayStartMinutes={dayStartMinutes}
          />
        </div>
      ))}
    </>
  )
}
