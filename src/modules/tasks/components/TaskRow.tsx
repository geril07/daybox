import {
  Check,
  Target,
  Trash2,
  Calendar,
  GripVertical,
  MoreHorizontal,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { GroupSelect, useGroupStore } from '@/modules/groups'
import { useTimerStore } from '@/modules/timer'
import { isOverdue, formatDate, getTomorrow } from '@/shared/dates'
import {
  Button,
  NumberInput,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { useTaskStore } from '../store'
import type { Task } from '../types'
import { TaskActionSheet } from './TaskActionSheet'

interface TaskRowProps {
  task: Task
  dragHandleRef?: (element: Element | null) => void
}

export function TaskRow({ task, dragHandleRef }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const groups = useGroupStore((s) => s.groups)
  const focusedTaskId = useTimerStore((s) => s.focusedTaskId)
  const focusTask = useTimerStore((s) => s.focusTask)

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
        'transition-background border-border group flex min-h-[46px] items-center gap-2.5 rounded border-b px-1.5 py-2 duration-120',
        isFocused && 'bg-accent-bg',
        !isFocused && overdue && 'bg-overdue-bg',
      )}
    >
      <div
        ref={dragHandleRef}
        className="text-muted-foreground shrink-0 cursor-grab p-0.5 opacity-0 transition-opacity duration-120 group-hover:opacity-100 active:cursor-grabbing pointer-coarse:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </div>

      <Button
        variant="ghost"
        size="none"
        className={cn(
          'h-[19px] w-[19px] shrink-0 rounded-full border p-0 duration-140',
          task.completed
            ? 'border-success bg-success text-white'
            : 'border-border-strong bg-transparent text-transparent',
        )}
        onClick={() => toggleTask(task.id)}
      >
        {task.completed && <Check size={10} strokeWidth={3} />}
      </Button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="text-foreground w-full border-none bg-transparent text-sm font-[450] outline-none"
            style={{ caretColor: 'var(--accent)' }}
          />
        ) : (
          <span
            className={cn(
              'block cursor-text truncate text-sm leading-snug font-[450]',
              task.completed ? 'text-fg-3 line-through' : 'text-fg',
            )}
            onClick={handleStartEdit}
          >
            {task.title}
          </span>
        )}
      </div>

      {showGroupUi && group && (
        <GroupSelect
          groupId={task.groupId}
          groups={groups}
          onChange={(newGroupId) =>
            updateTask(task.id, { groupId: newGroupId })
          }
          triggerProps={{ className: 'flex shrink-0 items-center gap-1.5' }}
        >
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: group.color }}
          />
          <span className="text-muted-foreground text-xs">{group.name}</span>
        </GroupSelect>
      )}

      {overdue && (
        <span className="text-destructive bg-overdue-bg border-overdue-border shrink-0 rounded-full border px-[7px] py-0.5 text-xs font-medium">
          OVERDUE
        </span>
      )}

      <PomoArea task={task} />
      <DatePickerButton task={task} />

      <>
        <div className="group/actions flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-120 group-hover:opacity-100 pointer-coarse:hidden">
          <Button
            variant="ghostDestructive"
            size="icon-sm"
            onClick={() => focusTask(task.id)}
            title="Focus"
          >
            <Target />
          </Button>
          <Button
            variant="ghostDestructive"
            size="icon-sm"
            onClick={() => deleteTask(task.id)}
            title="Delete"
          >
            <Trash2 />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pointer-fine:hidden">
          <Button
            variant="ghostDestructive"
            size="icon-sm"
            onClick={() => setActionSheetOpen(true)}
            title="More actions"
          >
            <MoreHorizontal />
          </Button>
          <TaskActionSheet
            task={task}
            open={actionSheetOpen}
            onOpenChange={setActionSheetOpen}
          />
        </div>
      </>
    </div>
  )
}

function PomoArea({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)

  const handleEstimateChange = (n: number | null) => {
    if (n == null) return
    updateTask(task.id, { pomoEstimate: n })
  }

  const handleCompletedChange = (n: number | null) => {
    if (n == null) return
    updateTask(task.id, { pomoCompleted: n })
  }

  const progressPct =
    task.pomoEstimate > 0
      ? Math.min(100, (task.pomoCompleted / task.pomoEstimate) * 100)
      : 0

  return (
    <Popover>
      <PopoverTrigger>
        <span className="relative flex min-w-8 shrink-0 cursor-pointer items-center">
          <span className="flex flex-col items-start gap-px">
            <span className="text-fg-2 text-xs leading-none tabular-nums">
              {task.pomoCompleted}/{task.pomoEstimate}
            </span>
            <span className="relative block h-[1.5px] w-full">
              <span
                className="bg-accent absolute top-0 left-0 block h-full transition-[width] duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </span>
          </span>
        </span>
      </PopoverTrigger>
      <PopoverContent className="z-40 w-fit flex-row gap-3 p-3">
        <div className="flex min-w-[100px] flex-col items-center gap-2">
          <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Estimate
          </label>
          <NumberInput
            value={task.pomoEstimate}
            onValueChange={handleEstimateChange}
            min={0}
            max={99}
          />
        </div>
        <div className="flex min-w-[100px] flex-col items-center gap-2">
          <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Completed
          </label>
          <NumberInput
            value={task.pomoCompleted}
            onValueChange={handleCompletedChange}
            min={0}
            max={99}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DatePickerButton({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)

  return (
    <Popover>
      <PopoverTrigger>
        <span
          className="text-muted-foreground flex h-7 w-7 items-center justify-center rounded transition-all duration-120"
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
              value: formatDate(getTomorrow()),
            },
            { label: 'Unscheduled', value: null },
          ].map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="none"
              className="border-border hover:border-accent hover:text-accent hover:bg-accent-bg flex-1 shrink rounded px-1 py-1.5 text-center text-xs duration-120"
              onClick={() => updateTask(task.id, { date: preset.value })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <input
          type="date"
          className="border-border bg-background text-foreground w-full rounded border px-2 py-1.5 text-xs transition-colors duration-140 outline-none"
          onChange={(e) =>
            updateTask(task.id, { date: e.target.value || null })
          }
        />
      </PopoverContent>
    </Popover>
  )
}
