import { arrayMove } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { AnimatePresence, motion } from 'motion/react'

import {
  TRANSITION_ENTER,
  TRANSITION_MOVE,
  TRANSITION_TOGGLE,
  useLayoutSnap,
} from '@/shared/utils/motion'

import { useTaskStore } from '../store'
import type { Task } from '../types'
import { TaskRow } from './TaskRow'

interface TaskListProps {
  tasks: Task[]
  emptyMessage?: string
  date?: string | null
}

export function TaskList({ tasks, emptyMessage, date }: TaskListProps) {
  const reorderTasks = useTaskStore((s) => s.reorderTasks)
  const { snapLayout, snap } = useLayoutSnap()

  const isDraggable = date !== undefined
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
    snap(() => reorderTasks(date, reorderedIds))
  }

  return (
    <div>
      <AnimatePresence initial={false}>
        {tasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TRANSITION_ENTER}
            className="text-muted-foreground py-14 text-center"
          >
            {emptyMessage || 'No tasks yet.'}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TRANSITION_ENTER}
            className="relative"
          >
            {isDraggable && groupKey ? (
              <DragDropProvider onDragEnd={handleDragEnd}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {tasks.map((task, index) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      groupKey={groupKey}
                      snapLayout={snapLayout}
                    />
                  ))}
                </AnimatePresence>
              </DragDropProvider>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                {tasks.map((task) => (
                  <StaticTaskRow
                    key={task.id}
                    task={task}
                    snapLayout={snapLayout}
                  />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SortableTaskRow({
  task,
  index,
  groupKey,
  snapLayout,
}: {
  task: Task
  index: number
  groupKey: string
  snapLayout: boolean
}) {
  const { ref, handleRef } = useSortable({
    id: task.id,
    index,
    group: groupKey,
  })

  return (
    <motion.div
      ref={ref}
      layout="position"
      layoutId={task.id}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: task.completed ? 0.52 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        opacity: TRANSITION_TOGGLE,
        y: TRANSITION_ENTER,
        layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE,
      }}
    >
      <TaskRow task={task} dragHandleRef={handleRef} />
    </motion.div>
  )
}

function StaticTaskRow({
  task,
  snapLayout,
}: {
  task: Task
  snapLayout: boolean
}) {
  return (
    <motion.div
      layout="position"
      layoutId={task.id}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: task.completed ? 0.52 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        opacity: TRANSITION_TOGGLE,
        y: TRANSITION_ENTER,
        layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE,
      }}
    >
      <TaskRow task={task} />
    </motion.div>
  )
}
