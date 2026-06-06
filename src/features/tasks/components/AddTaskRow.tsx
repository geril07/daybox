import { Plus, ChevronDown } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

import { useGroupStore, type Group } from '@/features/groups'
import { Button, Popover, PopoverTrigger, PopoverContent } from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { useTaskStore } from '../store'

interface AddTaskRowProps {
  defaultDate?: string | null
}

export function AddTaskRow({ defaultDate }: AddTaskRowProps) {
  const [title, setTitle] = useState('')
  const [showTypeahead, setShowTypeahead] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)
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
    setShowTypeahead(false)
    setHighlightIndex(null)
    inputRef.current?.focus()
  }, [title, groups, stickyGroupId, defaultDate, addTask, addGroup])

  const typeaheadQuery = title.match(/#(\S*)$/)?.[1] || ''
  const typeaheadMatches = typeaheadQuery
    ? groups
        .filter((g) =>
          g.name.toLowerCase().startsWith(typeaheadQuery.toLowerCase()),
        )
        .slice(0, 5)
    : groups.slice(0, 5)

  const handleAccept = useCallback(
    (group: Group) => {
      setTitle(title.replace(/#\S*$/, `#${group.name} `))
      setShowTypeahead(false)
      setHighlightIndex(null)
      inputRef.current?.focus()
    },
    [title],
  )

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setHighlightIndex(null)
    const hashMatch = e.target.value.match(/#(\S*)$/)
    setShowTypeahead(!!hashMatch)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (
        showTypeahead &&
        highlightIndex != null &&
        typeaheadMatches.length > 0
      ) {
        e.preventDefault()
        handleAccept(typeaheadMatches[highlightIndex])
        return
      }
      handleSubmit()
      return
    }
    if (e.key === 'Escape' && showTypeahead) {
      e.preventDefault()
      setShowTypeahead(false)
      setHighlightIndex(null)
      return
    }
    if (showTypeahead && typeaheadMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev == null ? 0 : (prev + 1) % typeaheadMatches.length,
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev == null
            ? typeaheadMatches.length - 1
            : (prev - 1 + typeaheadMatches.length) % typeaheadMatches.length,
        )
        return
      }
    }
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
          className="text-foreground flex-1 border-none bg-transparent py-2 text-sm outline-none"
        />
        {showGroupUi && (
          <GroupChip
            group={currentGroup}
            groups={groups}
            onSelect={setStickyGroupId}
          />
        )}
      </div>
      <Popover
        open={showTypeahead}
        onOpenChange={(open) => {
          if (!open) setShowTypeahead(false)
        }}
      >
        <PopoverContent
          anchor={inputRef}
          side="bottom"
          align="start"
          sideOffset={4}
          initialFocus={false}
          className="bg-card text-popover-foreground min-w-[180px] gap-0 p-1"
        >
          <GroupTypeahead
            query={typeaheadQuery}
            groups={groups}
            highlightIndex={highlightIndex}
            onSelect={handleAccept}
          />
        </PopoverContent>
      </Popover>
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
        <span className="border-border text-muted-foreground flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors duration-140">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: group.color }}
          />
          {group.name}
          <ChevronDown size={10} />
        </span>
      </PopoverTrigger>
      <PopoverContent className="z-50 min-w-[140px] p-2" align="end">
        {groups.map((g) => (
          <Button
            key={g.id}
            variant="ghost"
            size="none"
            className={cn(
              'w-full justify-start gap-2 rounded px-3 py-2 text-left text-sm duration-100',
              g.id === group.id ? 'text-accent' : 'text-fg-2',
            )}
            onClick={() => onSelect(g.id)}
          >
            <span
              className="size-2 shrink-0 rounded-full"
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
  highlightIndex,
  onSelect,
}: {
  query: string
  groups: Group[]
  highlightIndex: number | null
  onSelect: (group: Group) => void
}) {
  const matched = query
    ? groups
        .filter((g) => g.name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 5)
    : groups.slice(0, 5)

  if (matched.length === 0 && query) {
    return (
      <div className="text-muted-foreground w-full px-3 py-2 text-sm">
        Press Enter to create group &quot;{query}&quot;
      </div>
    )
  }

  return (
    <>
      {matched.map((g, i) => (
        <Button
          key={g.id}
          variant="ghost"
          size="none"
          tabIndex={-1}
          data-highlighted={i === highlightIndex ? 'true' : undefined}
          className={cn(
            'text-fg-2 w-full justify-start gap-2 rounded px-3 py-2 text-left text-sm duration-100',
            i === highlightIndex && 'bg-muted text-foreground',
          )}
          onClick={() => onSelect(g)}
        >
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: g.color }}
          />
          {g.name}
        </Button>
      ))}
    </>
  )
}
