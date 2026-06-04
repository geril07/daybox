import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useUIStore } from '@/app/uiStore'
import { TaskList, selectForDate, useTaskStore } from '@/features/tasks'
import { EmptyState } from '@/shared/EmptyState'
import { formatDate } from '@/shared/dates'

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
        <button
          className="text-muted-foreground hover:text-fg hover:bg-bg-hover flex h-[22px] w-[22px] items-center justify-center rounded-[4px]"
          onClick={goBack}
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-fg-2 min-w-[120px] text-center text-xs font-medium">
          {browseDate}
        </span>
        <button
          className="text-muted-foreground hover:text-fg hover:bg-bg-hover flex h-[22px] w-[22px] items-center justify-center rounded-[4px]"
          onClick={goForward}
        >
          <ChevronRight size={12} />
        </button>
      </div>
      <TaskList tasks={dateTasks} />
    </div>
  )
}
