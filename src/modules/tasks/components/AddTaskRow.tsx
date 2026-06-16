import { Plus, ChevronDown } from 'lucide-react'
import { useState, useRef, type SubmitEvent } from 'react'

import { GroupSelect, useGroupStore } from '@/modules/groups'
import { Button } from '@/shared/ui'

import { useTaskStore } from '../store'

interface AddTaskRowProps {
  defaultDate?: string | null
  defaultGroupId?: string | null
}

export function AddTaskRow({ defaultDate, defaultGroupId }: AddTaskRowProps) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const groups = useGroupStore((s) => s.groups)
  const addTask = useTaskStore((s) => s.addTask)
  const addGroup = useGroupStore((s) => s.addGroup)
  const stickyGroupId = useGroupStore((s) => s.stickyGroupId)
  const setStickyGroupId = useGroupStore((s) => s.setStickyGroupId)

  const showGroupUi = groups.length > 1
  const currentGroup =
    groups.find((g) => g.id === (stickyGroupId || groups[0].id)) || groups[0]

  const handleSubmit = (e?: SubmitEvent) => {
    e?.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) return

    let taskTitle = trimmed
    let groupId = defaultGroupId ?? stickyGroupId ?? groups[0].id

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
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  return (
    <form
      className="add-task-wrap border-border border-b pt-3.5 pb-1.5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleInput}
          placeholder="Add a task…"
          className="text-foreground flex-1 border-none bg-transparent py-2 text-sm outline-none"
        />
        {showGroupUi && (
          <GroupSelect
            groupId={currentGroup.id}
            groups={groups}
            onChange={setStickyGroupId}
            triggerProps={{
              className:
                'border-border text-muted-foreground flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors duration-140',
            }}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: currentGroup.color }}
            />
            {currentGroup.name}
            <ChevronDown size={10} />
          </GroupSelect>
        )}
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          title="Add task"
          aria-label="Add task"
          disabled={!title.trim()}
          className="pointer-fine:hidden"
        >
          <Plus />
        </Button>
      </div>
    </form>
  )
}
