import { ChevronLeft, ChevronRight } from 'lucide-react'

import { TaskList, selectForDate, useTaskStore } from '@/modules/tasks'
import { EmptyState } from '@/shared/ui'
import { Button } from '@/shared/ui'

import { usePlannerStore } from '../store'

export function DateBrowser() {
  const browseDate = usePlannerStore((s) => s.browseDate)
  const stepBrowseDate = usePlannerStore((s) => s.stepBrowseDate)
  const dayStartMinutes = usePlannerStore((s) => s.dayStartMinutes)
  const tasks = useTaskStore((s) => s.tasks)

  const dateTasks = browseDate ? selectForDate(tasks, browseDate) : []

  const goBack = () => stepBrowseDate(-1)
  const goForward = () => stepBrowseDate(1)

  if (!browseDate) {
    return (
      <EmptyState
        title="Select a date to browse."
        description="Use the date stepper above."
      />
    )
  }

  return (
    <>
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
      <TaskList
        tasks={dateTasks}
        date={browseDate}
        dayStartMinutes={dayStartMinutes}
      />
    </>
  )
}
