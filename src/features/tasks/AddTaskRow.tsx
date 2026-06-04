import { useState, useRef, useEffect, useCallback } from 'react'
import { Popover } from '@base-ui/react'
import { useAppStore } from '../../app/store'
import type { Group } from '../../shared/types'

interface AddTaskRowProps {
  defaultDate?: string | null
}

export default function AddTaskRow({ defaultDate }: AddTaskRowProps) {
  const [title, setTitle] = useState('')
  const [showTypeahead, setShowTypeahead] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const groups = useAppStore(s => s.groups)
  const addTask = useAppStore(s => s.addTask)
  const addGroup = useAppStore(s => s.addGroup)
  const stickyGroupId = useAppStore(s => s.stickyGroupId)
  const setStickyGroupId = useAppStore(s => s.setStickyGroupId)

  const showGroupUi = groups.length > 1
  const currentGroup = groups.find(g => g.id === (stickyGroupId || groups[0].id)) || groups[0]

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return

    let taskTitle = trimmed
    let groupId = stickyGroupId || groups[0].id

    const hashMatch = trimmed.match(/^(.*?)\s+#(\S+)$/)
    if (hashMatch) {
      taskTitle = hashMatch[1] || trimmed
      const groupName = hashMatch[2]
      const existingGroup = groups.find(
        g => g.name.toLowerCase() === groupName.toLowerCase(),
      )
      if (existingGroup) {
        groupId = existingGroup.id
      } else {
        const newGroup = addGroup(groupName)
        groupId = newGroup.id
      }
    }

    addTask(taskTitle, groupId, defaultDate)
    setTitle('')
    inputRef.current?.focus()
  }, [title, groups, stickyGroupId, defaultDate, addTask, addGroup])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    const hashMatch = e.target.value.match(/#(\S*)$/)
    setShowTypeahead(!!hashMatch)
  }

  return (
    <div className="add-task-wrap" style={{ padding: '14px 0 6px', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded-full border border-dashed flex items-center justify-center shrink-0 transition-[border-color,color] duration-140"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-3)' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Add a task — type #group to assign..."
          className="flex-1 bg-transparent border-none text-[14.5px] outline-none"
          style={{ color: 'var(--fg)', padding: '8px 0' }}
        />
        {showGroupUi && (
          <GroupChip
            group={currentGroup}
            groups={groups}
            onSelect={setStickyGroupId}
          />
        )}
      </div>
      {showTypeahead && (
        <GroupTypeahead
          query={title.match(/#(\S*)$/)?.[1] || ''}
          groups={groups}
          onSelect={g => {
            setTitle(title.replace(/#\S*$/, `#${g.name} `))
            setShowTypeahead(false)
            inputRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function GroupChip({
  group,
  groups,
  onSelect,
}: {
  group: Group
  groups: Group[]
  onSelect: (id: string) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs shrink-0 transition-border duration-140" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: group.color }} />
        {group.name}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-50" style={{ top: 4 }}>
          <Popover.Popup className="rounded-[10px] p-2 min-w-[140px] shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {groups.map(g => (
              <button
                key={g.id}
                className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left rounded-[4px] transition-background duration-100"
                style={{ color: g.id === group.id ? 'var(--accent)' : 'var(--fg-2)' }}
                onClick={() => {
                  onSelect(g.id)
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: g.color }} />
                {g.name}
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function GroupTypeahead({
  query,
  groups,
  onSelect,
}: {
  query: string
  groups: Group[]
  onSelect: (group: Group) => void
}) {
  const matched = query
    ? groups.filter(g => g.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)
    : groups.slice(0, 5)

  if (matched.length === 0 && query) {
    return (
      <div className="text-xs mt-1 ml-7" style={{ color: 'var(--fg-3)' }}>
        Press Enter to create group &quot;{query}&quot;
      </div>
    )
  }

  return (
    <div className="ml-7 mt-1 rounded-[6px] overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {matched.map(g => (
        <button
          key={g.id}
          className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-background duration-100"
          style={{ color: 'var(--fg-2)' }}
          onClick={() => onSelect(g)}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: g.color }} />
          {g.name}
        </button>
      ))}
    </div>
  )
}
