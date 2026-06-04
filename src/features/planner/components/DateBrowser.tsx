import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useUIStore } from '@/app/uiStore'
import { TaskList, selectForDate, useTaskStore } from '@/features/tasks'
import { EmptyState } from '@/shared/EmptyState'
import { formatDate } from '@/shared/dates'
import { Button } from '@/shared/ui'

export function DateBrowser() {
  const browseDate = useUIStore((s) => s.browseDate)
  const setBrowseDate = useUIStore((s) => s.setBrowseDate)
  const tasks = useTaskStore((s) => s.tasks)

  const dateTasks = browseDate ? selectForDate(tasks, browseDate) : []

  const goBack = () => {
    const current = browseDate ? new Date(browseDate) : new Date()
    current.setDate(current.getDate() - 1)
    setBrowseDate(formatDate(current))
  }

  const goForward = () => {
    const current = browseDate ? new Date(browseDate) : new Date()
    current.setDate(current.getDate() + 1)
    setBrowseDate(formatDate(current))
  }

  if (!browseDate) {
    return (
      <EmptyState
        title="Select a date to browse."
        description="Use the date stepper above."
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 pt-2 pb-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={goBack}
          aria-label="Previous day"
        >
          <ChevronLeft />
        </Button>
        <span className="text-fg-2 min-w-[120px] text-center text-xs font-medium">
          {browseDate}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={goForward}
          aria-label="Next day"
        >
          <ChevronRight />
        </Button>
      </div>
      <TaskList tasks={dateTasks} />
    </div>
  )
}
