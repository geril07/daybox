import { arrayMove } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { flushSync } from 'react-dom'

import {
  TRANSITION_ENTER,
  TRANSITION_MOVE,
  TRANSITION_TOGGLE,
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
  const [snapLayout, setSnapLayout] = useState(false)

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
    flushSync(() => {
      setSnapLayout(true)
      reorderTasks(date, reorderedIds)
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
            {isDraggable && groupKey ? (
              <DragDropProvider onDragEnd={handleDragEnd}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {tasks.map((task, index) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      snapLayout={snapLayout}
                      groupKey={groupKey}
                    />
                  ))}
                </AnimatePresence>
              </DragDropProvider>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                {tasks.map((task) => (
                  <StaticTaskRow key={task.id} task={task} />
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
  snapLayout,
  groupKey,
}: {
  task: Task
  index: number
  snapLayout: boolean
  groupKey: string
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

function StaticTaskRow({ task }: { task: Task }) {
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
        layout: TRANSITION_MOVE,
      }}
    >
      <TaskRow task={task} />
    </motion.div>
  )
}
