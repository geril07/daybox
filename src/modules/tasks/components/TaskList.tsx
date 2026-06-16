import { arrayMove } from '@dnd-kit/helpers'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'

import { useTaskStore } from '../store'
import type { Task } from '../types'
import { TaskRow } from './TaskRow'
import { taskRowActivationConstraints } from './taskDragSensor'

interface TaskListProps {
  tasks: Task[]
  emptyMessage?: string
  date?: string | null
  sortable?: boolean
}

export function TaskList({
  tasks,
  emptyMessage,
  date,
  sortable,
}: TaskListProps) {
  const reorderTasks = useTaskStore((s) => s.reorderTasks)

  const isDraggable = sortable !== false && date !== undefined
  const groupKey = isDraggable ? `tasks:${date ?? 'undated'}` : null

  const handleDragEnd = (event: DragEndEvent) => {
    if (date === undefined) return
    if (event.canceled) return

    const { source } = event.operation
    if (!source || !isSortable(source)) return

    const { initialIndex, index } = source
    if (initialIndex === index) return
    if (initialIndex < 0 || index < 0) return
    if (initialIndex >= tasks.length || index >= tasks.length) return

    const reorderedIds = arrayMove(tasks, initialIndex, index).map((t) => t.id)
    reorderTasks(date, reorderedIds)
  }

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground py-14 text-center">
        {emptyMessage || 'No tasks yet.'}
      </div>
    )
  }

  return (
    <div className="relative">
      {isDraggable && groupKey ? (
        <DragDropProvider onDragEnd={handleDragEnd}>
          {tasks.map((task, index) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              index={index}
              groupKey={groupKey}
            />
          ))}
        </DragDropProvider>
      ) : (
        tasks.map((task) => <StaticTaskRow key={task.id} task={task} />)
      )}
    </div>
  )
}

function SortableTaskRow({
  task,
  index,
  groupKey,
}: {
  task: Task
  index: number
  groupKey: string
}) {
  const { ref, handleRef } = useSortable({
    id: task.id,
    index,
    group: groupKey,
    sensors: [
      PointerSensor.configure({
        activationConstraints: taskRowActivationConstraints,
      }),
    ],
  })

  return (
    <div ref={ref}>
      <TaskRow task={task} dragHandleRef={handleRef} />
    </div>
  )
}

function StaticTaskRow({ task }: { task: Task }) {
  return (
    <div>
      <TaskRow task={task} />
    </div>
  )
}
