import { useState, useRef, useEffect } from 'react'
import { Popover } from '@base-ui/react'
import { useAppStore } from '../../app/store'
import { useTimerStore } from '../../app/timerStore'
import type { Task } from '../../shared/types'
import { isOverdue, formatDate } from '../../shared/dates'

interface TaskRowProps {
  task: Task
  dragHandleRef?: React.RefObject<HTMLDivElement | null>
}

export default function TaskRow({ task, dragHandleRef }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [hovering, setHovering] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)
  const toggleTask = useAppStore(s => s.toggleTask)
  const updateTask = useAppStore(s => s.updateTask)
  const deleteTask = useAppStore(s => s.deleteTask)
  const setFocusedTaskId = useAppStore(s => s.setFocusedTaskId)
  const groups = useAppStore(s => s.groups)
  const focusedTaskId = useAppStore(s => s.focusedTaskId)
  const timerSetPhase = useTimerStore(s => s.setPhase)
  const timerReset = useTimerStore(s => s.reset)
  const timerStart = useTimerStore(s => s.start)
  const timerIsRunning = useTimerStore(s => s.isRunning)

  const group = groups.find(g => g.id === task.groupId)
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
      className="flex items-center gap-2.5 px-1.5 py-2 min-h-[46px] rounded-[4px] transition-background duration-120"
      style={{
        borderBottom: '1px solid var(--border)',
        background: isFocused ? 'var(--accent-bg)' : overdue ? 'var(--overdue-bg)' : 'transparent',
        opacity: task.completed ? 0.52 : 1,
      }}
      onMouseEnter={e => { setHovering(true); if (!isFocused) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { setHovering(false); e.currentTarget.style.background = isFocused ? 'var(--accent-bg)' : overdue ? 'var(--overdue-bg)' : 'transparent' }}
    >
      <div
        ref={dragHandleRef}
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 transition-opacity duration-120"
        style={{ color: 'var(--fg-3)', opacity: hovering ? 1 : 0 }}
        onClick={e => e.stopPropagation()}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
          <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
        </svg>
      </div>

      <button
        className="w-[19px] h-[19px] rounded-full border flex items-center justify-center shrink-0 transition-all duration-140"
        style={{
          borderColor: task.completed ? 'var(--success)' : 'var(--border-strong)',
          background: task.completed ? 'var(--success)' : 'transparent',
          color: task.completed ? 'white' : 'transparent',
        }}
        onClick={() => toggleTask(task.id)}
      >
        {task.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-[14.5px] font-[450]"
            style={{ color: 'var(--fg)', caretColor: 'var(--accent)' }}
          />
        ) : (
          <span
            className="block text-[14.5px] font-[450] truncate cursor-text"
            style={{
              color: task.completed ? 'var(--fg-3)' : 'var(--fg)',
              textDecoration: task.completed ? 'line-through' : 'none',
              lineHeight: 1.4,
            }}
            onClick={handleStartEdit}
          >
            {task.title}
          </span>
        )}
      </div>

      {showGroupUi && group && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: group.color }} />
          {group.name !== 'General' && (
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{group.name}</span>
          )}
        </div>
      )}

      {overdue && (
        <span className="text-xs font-medium px-[7px] py-[2px] rounded-full shrink-0" style={{ color: 'var(--overdue)', background: 'var(--overdue-bg)', border: '1px solid var(--overdue-border)' }}>
          OVERDUE
        </span>
      )}

      <PomoArea task={task} />
      <DatePickerButton task={task} />

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 transition-opacity duration-120"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0' }}>
        <button
          className="w-7 h-7 rounded-[4px] flex items-center justify-center transition-all duration-120"
          style={{ color: 'var(--fg-3)' }}
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
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)' }}
          title="Focus"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          className="w-7 h-7 rounded-[4px] flex items-center justify-center transition-all duration-120"
          style={{ color: 'var(--fg-3)' }}
          onClick={() => deleteTask(task.id)}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--overdue)'; e.currentTarget.style.background = 'var(--overdue-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'transparent' }}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function PomoArea({ task }: { task: Task }) {
  const updateTask = useAppStore(s => s.updateTask)

  return (
    <Popover.Root>
      <Popover.Trigger className="relative shrink-0 flex items-center min-w-[32px] cursor-pointer">
        {task.pomoEstimate > 0 ? (
          <div className="flex gap-[3px] items-center">
            {Array.from({ length: task.pomoEstimate }, (_, i) => (
              <span
                key={i}
                className="w-[7px] h-[7px] rounded-full"
                style={{
                  background: i < task.pomoCompleted ? 'var(--accent)' : 'transparent',
                  border: i < task.pomoCompleted ? 'none' : '1.5px solid var(--border-strong)',
                }}
              />
            ))}
          </div>
        ) : (
          <span className="text-[11.5px]" style={{ color: 'var(--fg-3)' }}>
            {task.pomoCompleted > 0 ? task.pomoCompleted : '0'}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-40">
          <Popover.Popup
            className="rounded-[10px] p-3 shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.5px] mb-2" style={{ color: 'var(--fg-3)' }}>
              Pomodoros
            </div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 9 }, (_, i) => (
                <button
                  key={i}
                  className="w-[26px] h-[26px] rounded-[4px] text-[12.5px] flex items-center justify-center transition-all duration-120"
                  style={{
                    border: '1px solid var(--border)',
                    color: task.pomoEstimate === i ? 'white' : 'var(--fg-2)',
                    background: task.pomoEstimate === i ? 'var(--accent)' : 'transparent',
                    borderColor: task.pomoEstimate === i ? 'var(--accent)' : 'var(--border)',
                  }}
                  onClick={() => updateTask(task.id, { pomoEstimate: i })}
                  onMouseEnter={e => { if (task.pomoEstimate !== i) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' } }}
                  onMouseLeave={e => { if (task.pomoEstimate !== i) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)' } }}
                >
                  {i}
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function DatePickerButton({ task }: { task: Task }) {
  const updateTask = useAppStore(s => s.updateTask)

  return (
    <Popover.Root>
      <Popover.Trigger
        className="w-7 h-7 rounded-[4px] flex items-center justify-center transition-all duration-120"
        style={{ color: 'var(--fg-3)' }}
        title="Schedule"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-40">
          <Popover.Popup
            className="rounded-[10px] p-2 shadow-lg min-w-[190px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex gap-1 mb-2">
              {[
                { label: 'Today', value: formatDate(new Date()) },
                { label: 'Tomorrow', value: formatDate(new Date(Date.now() + 86400000)) },
                { label: 'Unsched.', value: null },
              ].map(preset => (
                <button
                  key={preset.label}
                  className="flex-1 px-1 py-1.5 text-xs rounded-[4px] text-center transition-all duration-120"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}
                  onClick={() => updateTask(task.id, { date: preset.value })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'transparent' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="w-full px-2 py-1.5 text-xs rounded-[4px] outline-none transition-border duration-140"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--fg)',
                background: 'var(--bg)',
              }}
              onChange={e => updateTask(task.id, { date: e.target.value || null })}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
