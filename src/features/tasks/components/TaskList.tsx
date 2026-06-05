import { arrayMove } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { flushSync } from 'react-dom'

import { TaskRow, useTaskStore } from '@/features/tasks'
import type { Task } from '@/features/tasks/types'
import {
  TRANSITION_ENTER,
  TRANSITION_MOVE,
  TRANSITION_TOGGLE,
} from '@/shared/motion'

interface TaskListProps {
  tasks: Task[]
  emptyMessage?: string
}

export function TaskList({ tasks, emptyMessage }: TaskListProps) {
  const reorderTasks = useTaskStore((s) => s.reorderTasks)
  const [snapLayout, setSnapLayout] = useState(false)

  const handleDragEnd = (event: DragEndEvent) => {
    const { source, target } = event.operation
    if (!source || !target) return
    if (source.id === target.id) return

    const sourceIndex = tasks.findIndex((t) => t.id === source.id)
    const targetIndex = tasks.findIndex((t) => t.id === target.id)
    if (sourceIndex === -1 || targetIndex === -1) return

    const reordered = arrayMove(tasks, sourceIndex, targetIndex)
    flushSync(() => {
      setSnapLayout(true)
      reorderTasks(reordered)
    })
    requestAnimationFrame(() => setSnapLayout(false))
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
            <DragDropProvider onDragEnd={handleDragEnd}>
              <AnimatePresence mode="popLayout" initial={false}>
                {tasks.map((task, index) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    snapLayout={snapLayout}
                  />
                ))}
              </AnimatePresence>
            </DragDropProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SortableTaskRow({
  task,
  index,
  snapLayout,
}: {
  task: Task
  index: number
  snapLayout: boolean
}) {
  const { ref, handleRef } = useSortable({
    id: task.id,
    index,
    group: 'tasks',
  })

  return (
    <motion.div
      ref={ref}
      layout="position"
      layoutId={task.id}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: task.completed ? 0.52 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={
        snapLayout
          ? {
              opacity: TRANSITION_TOGGLE,
              y: TRANSITION_ENTER,
              layout: { duration: 0 },
            }
          : {
              opacity: TRANSITION_TOGGLE,
              y: TRANSITION_ENTER,
              layout: TRANSITION_MOVE,
            }
      }
    >
      <TaskRow task={task} dragHandleRef={handleRef} />
    </motion.div>
  )
}
