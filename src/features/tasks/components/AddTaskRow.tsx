import { Plus, ChevronDown } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

import { useGroupStore } from '@/features/groups'
import type { Group } from '@/features/groups/types'
import { useTaskStore } from '@/features/tasks'
import { cn } from '@/shared/utils/cn'
import { Button, Popover, PopoverTrigger, PopoverContent } from '@/shared/ui'

interface AddTaskRowProps {
  defaultDate?: string | null
}

export function AddTaskRow({ defaultDate }: AddTaskRowProps) {
  const [title, setTitle] = useState('')
  const [showTypeahead, setShowTypeahead] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const groups = useGroupStore((s) => s.groups)
  const addTask = useTaskStore((s) => s.addTask)
  const addGroup = useGroupStore((s) => s.addGroup)
  const stickyGroupId = useGroupStore((s) => s.stickyGroupId)
  const setStickyGroupId = useGroupStore((s) => s.setStickyGroupId)

  const showGroupUi = groups.length > 1
  const currentGroup =
    groups.find((g) => g.id === (stickyGroupId || groups[0].id)) || groups[0]

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
        (g) => g.name.toLowerCase() === groupName.toLowerCase(),
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
    <div className="add-task-wrap border-border border-b pt-3.5 pb-1.5">
      <div className="flex items-center gap-2.5">
        <div className="text-muted-foreground border-border-strong flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed transition-[border-color,color] duration-140">
          <Plus size={10} strokeWidth={3} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Add a task — type #group to assign..."
          className="text-foreground flex-1 border-none bg-transparent py-2 text-[14.5px] outline-none"
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
          onSelect={(g) => {
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
    <Popover>
      <PopoverTrigger>
        <span className="border-border text-muted-foreground flex shrink-0 items-center gap-1.5 rounded-[4px] border px-2 py-1 text-xs transition-colors duration-140">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: group.color }}
          />
          {group.name}
          <ChevronDown size={10} />
        </span>
      </PopoverTrigger>
      <PopoverContent className="z-50 min-w-[140px] p-2">
        {groups.map((g) => (
          <Button
            key={g.id}
            variant="ghost"
            size="none"
            className={cn(
              'w-full justify-start gap-2 rounded-[4px] px-3 py-2 text-left text-sm duration-100',
              g.id === group.id ? 'text-accent' : 'text-fg-2',
            )}
            onClick={() => onSelect(g.id)}
          >
            <span
              className="h-[8px] w-[8px] shrink-0 rounded-full"
              style={{ background: g.color }}
            />
            {g.name}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
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
    ? groups
        .filter((g) => g.name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 5)
    : groups.slice(0, 5)

  if (matched.length === 0 && query) {
    return (
      <div className="text-muted-foreground mt-1 ml-7 text-xs">
        Press Enter to create group &quot;{query}&quot;
      </div>
    )
  }

  return (
    <div className="bg-card border-border mt-1 ml-7 overflow-hidden rounded-[6px] border shadow-sm">
      {matched.map((g) => (
        <Button
          key={g.id}
          variant="ghost"
          size="none"
          className="text-fg-2 w-full justify-start gap-2 px-3 py-2 text-left text-sm duration-100"
          onClick={() => onSelect(g)}
        >
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: g.color }}
          />
          {g.name}
        </Button>
      ))}
    </div>
  )
}
