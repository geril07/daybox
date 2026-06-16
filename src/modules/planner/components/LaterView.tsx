import { LayoutGroup } from 'motion/react'

import { TaskList } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'

import { useLaterSections, viewMetaMap, filterByGroup } from '../queries'
import { SectionHeader } from './SectionHeader'

interface LaterViewProps {
  selectedGroupId?: string | null
}

export function LaterView({ selectedGroupId = null }: LaterViewProps) {
  const sections = useLaterSections()
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

  const isSortable = selectedGroupId === null

  return (
    <LayoutGroup id="planner-later">
      {filtered.map((section) => (
        <div key={section.key} className="mb-2">
          <SectionHeader label={section.label} />
          <TaskList
            tasks={section.tasks}
            date={section.date}
            sortable={isSortable}
          />
        </div>
      ))}
    </LayoutGroup>
  )
}
