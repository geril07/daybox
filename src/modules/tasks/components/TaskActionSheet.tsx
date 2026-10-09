import { useTimerStore } from '@/modules/timer'
import {
  Button,
  LinkifiedText,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui'

import type { Task } from '../types'

interface TaskActionSheetProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}

export function TaskActionSheet({
  task,
  open,
  onOpenChange,
  onDelete,
}: TaskActionSheetProps) {
  const handleFocus = () => {
    useTimerStore.getState().focusTask(task.id)
    onOpenChange(false)
  }

  const handleDelete = () => {
    onOpenChange(false)
    onDelete()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="break-words whitespace-pre-wrap">
            <LinkifiedText text={task.title} />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-2 pb-4">
          <Button
            variant="ghost"
            size="none"
            className="w-full justify-start gap-2 rounded px-3 py-2 text-left text-sm duration-100"
            onClick={handleFocus}
          >
            Focus this task
          </Button>
          <Button
            variant="ghost"
            size="none"
            className="w-full justify-start gap-2 rounded px-3 py-2 text-left text-sm duration-100"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
