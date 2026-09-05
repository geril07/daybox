import { Plus, ChevronDown } from 'lucide-react'
import {
  useState,
  useRef,
  useLayoutEffect,
  type KeyboardEvent,
  type SubmitEvent,
} from 'react'

import { GroupSelect, useGroupStore } from '@/modules/groups'
import { Button } from '@/shared/ui'

import { useTaskStore } from '../store'

interface AddTaskRowProps {
  defaultDate?: string | null
  defaultGroupId?: string | null
}

export function AddTaskRow({ defaultDate, defaultGroupId }: AddTaskRowProps) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }, [title])
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

    const hashMatch = trimmed.match(/^(.*?)\s+#(\S+)$/s)
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

    const task = addTask(taskTitle, groupId, defaultDate)
    if (task) {
      setTitle('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229 || e.shiftKey) return
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value)
  }

  return (
    <form
      className="add-task-wrap border-border border-b pt-3.5 pb-1.5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2.5">
        <textarea
          ref={inputRef}
          value={title}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Add a task…"
          aria-label="Add task (Shift+Enter for new line)"
          title="Shift+Enter for a new line"
          className="text-foreground min-h-9 flex-1 resize-none overflow-hidden border-none bg-transparent py-2 text-sm leading-5 outline-none"
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
