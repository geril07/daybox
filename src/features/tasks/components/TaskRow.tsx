import { Check, Target, Trash2, Calendar, GripVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { useGroupStore } from '@/features/groups/store'
import { useTaskStore } from '@/features/tasks/store'
import { useTimerStore } from '@/features/timer/store'
import { isOverdue, formatDate } from '@/shared/dates'
import { cn } from '@/shared/lib/utils'
import type { Task } from '@/shared/types'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui'

interface TaskRowProps {
  task: Task
  dragHandleRef?: React.RefObject<HTMLDivElement | null>
}

export default function TaskRow({ task, dragHandleRef }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [hovering, setHovering] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const groups = useGroupStore((s) => s.groups)
  const focusedTaskId = useTimerStore((s) => s.focusedTaskId)
  const setFocusedTaskId = useTimerStore((s) => s.setFocusedTaskId)
  const timerSetPhase = useTimerStore((s) => s.setPhase)
  const timerReset = useTimerStore((s) => s.reset)
  const timerStart = useTimerStore((s) => s.start)
  const timerIsRunning = useTimerStore((s) => s.isRunning)

  const group = groups.find((g) => g.id === task.groupId)
  const showGroupUi = groups.length > 1
  const isFocused = focusedTaskId === task.id
  const overdue = !task.completed && task.date !== null && isOverdue(task.date)

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editing])

  const handleStartEdit = () => {
    setEditTitle(task.title)
    setEditing(true)
  }

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed })
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(task.title)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div
      className={cn(
        'transition-background border-border flex min-h-[46px] items-center gap-2.5 rounded-[4px] border-b px-1.5 py-2 duration-120',
        isFocused && 'bg-accent-bg',
        !isFocused && overdue && 'bg-overdue-bg',
        task.completed && 'opacity-[0.52]',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        ref={dragHandleRef}
        className={cn(
          'text-muted-foreground shrink-0 cursor-grab p-0.5 transition-opacity duration-120 active:cursor-grabbing',
          hovering ? 'opacity-100' : 'opacity-0',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </div>

      <button
        className={cn(
          'flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border transition-all duration-140',
          task.completed
            ? 'border-success bg-success text-white'
            : 'border-border-strong bg-transparent text-transparent',
        )}
        onClick={() => toggleTask(task.id)}
      >
        {task.completed && <Check size={10} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="text-foreground w-full border-none bg-transparent text-[14.5px] font-[450] outline-none"
            style={{ caretColor: 'var(--accent)' }}
          />
        ) : (
          <span
            className={cn(
              'block cursor-text truncate text-[14.5px] leading-snug font-[450]',
              task.completed ? 'text-fg-3 line-through' : 'text-fg',
            )}
            onClick={handleStartEdit}
          >
            {task.title}
          </span>
        )}
      </div>

      {showGroupUi && group && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: group.color }}
          />
          {group.name !== 'General' && (
            <span className="text-muted-foreground text-xs">{group.name}</span>
          )}
        </div>
      )}

      {overdue && (
        <span
          className="text-destructive bg-overdue-bg border-overdue-border shrink-0 rounded-full border px-[7px] py-[2px] text-xs font-medium"
        >
          OVERDUE
        </span>
      )}

      <PomoArea task={task} />
      <DatePickerButton task={task} />

      <div
        className="group/actions flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-120 hover:opacity-100"
      >
        <button
          className="text-muted-foreground hover:text-accent flex h-7 w-7 items-center justify-center rounded-[4px] transition-all duration-120"
          onClick={() => {
            if (isFocused) {
              setFocusedTaskId(null)
            } else {
              setFocusedTaskId(task.id)
              timerSetPhase('focus')
              timerReset()
              if (timerIsRunning) timerStart()
            }
          }}
          title="Focus"
        >
          <Target size={14} />
        </button>
        <button
          className="text-muted-foreground hover:text-overdue hover:bg-overdue-bg flex h-7 w-7 items-center justify-center rounded-[4px] transition-all duration-120"
          onClick={() => deleteTask(task.id)}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function PomoArea({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)

  return (
    <Popover>
      <PopoverTrigger>
        <span className="relative flex min-w-[32px] shrink-0 cursor-pointer items-center">
          {task.pomoEstimate > 0 ? (
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: task.pomoEstimate }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-[7px] w-[7px] rounded-full',
                    i < task.pomoCompleted
                      ? 'bg-accent border-none'
                      : 'bg-transparent border border-border-strong',
                  )}
                />
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-[11.5px]">
              {task.pomoCompleted > 0 ? task.pomoCompleted : '0'}
            </span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="z-40 p-3">
        <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.5px] uppercase">
          Pomodoros
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <button
              key={i}
              className={cn(
                'flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[12.5px] transition-all duration-120 border',
                task.pomoEstimate === i
                  ? 'bg-accent border-accent text-white'
                  : 'border-border text-fg-2 bg-transparent',
              )}
              onClick={() => updateTask(task.id, { pomoEstimate: i })}
              onMouseEnter={(e) => {
                if (task.pomoEstimate !== i) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent)'
                }
              }}
              onMouseLeave={(e) => {
                if (task.pomoEstimate !== i) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--fg-2)'
                }
              }}
            >
              {i}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const tomorrowDate = Date.now() + 86400000

function DatePickerButton({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)

  return (
    <Popover>
      <PopoverTrigger>
        <span
          className="text-muted-foreground flex h-7 w-7 items-center justify-center rounded-[4px] transition-all duration-120"
          title="Schedule"
        >
          <Calendar size={14} />
        </span>
      </PopoverTrigger>
      <PopoverContent className="z-40 min-w-[190px] p-2">
        <div className="mb-2 flex gap-1">
          {[
            { label: 'Today', value: formatDate(new Date()) },
            {
              label: 'Tomorrow',
              value: formatDate(new Date(tomorrowDate)),
            },
            { label: 'Unsched.', value: null },
          ].map((preset) => (
            <button
              key={preset.label}
              className="border-border text-muted-foreground hover:border-accent hover:text-accent hover:bg-accent-bg flex-1 rounded-[4px] border px-1 py-1.5 text-center text-xs transition-all duration-120"
              onClick={() => updateTask(task.id, { date: preset.value })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          className="border-border bg-background text-foreground w-full rounded-[4px] border px-2 py-1.5 text-xs transition-colors duration-140 outline-none"
          onChange={(e) =>
            updateTask(task.id, { date: e.target.value || null })
          }
        />
      </PopoverContent>
    </Popover>
  )
}
