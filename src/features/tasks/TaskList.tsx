import { arrayMove } from '@dnd-kit/helpers'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import { useRef } from 'react'

import TaskRow from '@/features/tasks/TaskRow'
import { useTaskStore } from '@/features/tasks/store'
import type { Task } from '@/shared/types'

interface TaskListProps {
  tasks: Task[]
  emptyMessage?: string
}

export default function TaskList({ tasks, emptyMessage }: TaskListProps) {
  const reorderTasks = useTaskStore((s) => s.reorderTasks)

  const handleDragEnd = (event: DragEndEvent) => {
    const sourceId = event.operation.source?.id
    const targetId = event.operation.target?.id
    if (!sourceId || !targetId || sourceId === targetId) return

    const sourceIndex = tasks.findIndex((t) => t.id === sourceId)
    const targetIndex = tasks.findIndex((t) => t.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const reordered = arrayMove(tasks, sourceIndex, targetIndex)
    reorderTasks(reordered)
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <div className="text-muted-foreground py-14 text-center">
          {emptyMessage || 'No tasks yet.'}
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div>
            {tasks.map((task) => (
              <DroppableTaskRow key={task.id} task={task} />
            ))}
          </div>
        </DragDropProvider>
      )}
    </div>
  )
}

function DroppableTaskRow({ task }: { task: Task }) {
  const handleRef = useRef<HTMLDivElement>(null)
  const { ref: draggableRef } = useDraggable({ id: task.id, handle: handleRef })
  const { ref: droppableRef } = useDroppable({ id: task.id })

  return (
    <div ref={droppableRef}>
      <div ref={draggableRef}>
        <TaskRow task={task} dragHandleRef={handleRef} />
      </div>
    </div>
  )
}
