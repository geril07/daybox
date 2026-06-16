import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import {
  DEFAULT_GROUP_ID,
  GROUP_COLORS,
  useGroupStore,
  type Group,
} from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

export function GroupSettingsPanel() {
  const groups = useGroupStore((s) => s.groups)
  const addGroup = useGroupStore((s) => s.addGroup)
  const renameGroup = useGroupStore((s) => s.renameGroup)
  const setGroupColor = useGroupStore((s) => s.setGroupColor)
  const deleteGroup = useGroupStore((s) => s.deleteGroup)
  const [newGroupName, setNewGroupName] = useState('')

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    addGroup(name)
    setNewGroupName('')
  }

  const handleResolveAndDelete = (
    groupId: string,
    reassignToDefault: boolean,
  ) => {
    if (reassignToDefault) {
      useTaskStore.getState().reassignTasks(groupId, DEFAULT_GROUP_ID)
    } else {
      useTaskStore.getState().deleteTasksByGroupId(groupId)
    }
    deleteGroup(groupId)
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {groups.map((g) => (
          <GroupItem
            key={g.id}
            group={g}
            onRename={renameGroup}
            onSetColor={setGroupColor}
            onDelete={deleteGroup}
            onResolveAndDelete={handleResolveAndDelete}
            isLast={groups.length <= 1}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
          placeholder="Add group..."
          className="border-border bg-background text-foreground flex-1 rounded-xl border px-2.5 py-1.5 text-xs transition-colors duration-140 outline-none"
        />
        <Button variant="default" onClick={handleAddGroup}>
          Add
        </Button>
      </div>
    </div>
  )
}

function GroupItem({
  group,
  onRename,
  onSetColor,
  onDelete,
  onResolveAndDelete,
  isLast,
}: {
  group: Group
  onRename: (id: string, name: string) => void
  onSetColor: (id: string, color: string) => void
  onDelete: (id: string) => void
  onResolveAndDelete: (id: string, reassignToDefault: boolean) => void
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)

  const taskCount = useTaskStore(
    (s) => s.tasks.filter((t) => t.groupId === group.id).length,
  )
  const hasTasks = taskCount > 0
  const isDefault = group.id === DEFAULT_GROUP_ID
  const trashDisabled = isLast || isDefault

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== group.name) {
      onRename(group.id, trimmed)
    } else {
      setName(group.name)
    }
    setEditing(false)
  }

  const handleTrashClick = () => {
    if (trashDisabled) return
    if (!hasTasks) {
      onDelete(group.id)
      return
    }
    setPopoverOpen(true)
  }

  const handleMove = () => {
    onResolveAndDelete(group.id, true)
    setPopoverOpen(false)
  }

  const handleDeleteAll = () => {
    onResolveAndDelete(group.id, false)
    setPopoverOpen(false)
  }

  const handleCancel = () => {
    setPopoverOpen(false)
  }

  return (
    <div className="border-border bg-background flex items-center gap-2 rounded-xl border px-2.5 py-2">
      <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Change group color"
              className="size-2.5 shrink-0 cursor-pointer rounded-full ring-offset-background transition-colors hover:ring-2 hover:ring-border"
              style={{ background: group.color }}
            />
          }
        />
        <PopoverContent align="start" className="min-w-[180px] p-2.5">
          <div className="grid grid-cols-4 gap-1.5">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  'size-7 cursor-pointer rounded-full border-2 transition-colors',
                  group.color === c
                    ? 'border-foreground'
                    : 'hover:border-border border-transparent',
                )}
                style={{ background: c }}
                onClick={() => {
                  onSetColor(group.id, c)
                  setColorPopoverOpen(false)
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="border-border mt-2 flex items-center gap-1.5 border-t pt-2">
            <input
              type="color"
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              value={group.color}
              onChange={(e) => {
                onSetColor(group.id, e.target.value)
                setColorPopoverOpen(false)
              }}
              aria-label="Custom color"
            />
            <span className="text-muted-foreground text-xs">Custom</span>
          </div>
        </PopoverContent>
      </Popover>
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => {
            if (e.relatedTarget?.closest('[data-cancel]')) return
            handleSave()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setName(group.name)
              setEditing(false)
            }
          }}
          className="text-foreground flex-1 border-none bg-transparent text-xs outline-none"
          autoFocus
        />
      ) : (
        <span className="text-foreground flex-1 text-sm">{group.name}</span>
      )}
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <Button variant="ghost" size="xs" onClick={handleSave}>
              <Check className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              data-cancel
              onClick={() => {
                setName(group.name)
                setEditing(false)
              }}
            >
              <X className="size-3.5" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
          </Button>
        )}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghostDestructive"
                size="xs"
                disabled={trashDisabled}
                onClick={handleTrashClick}
              />
            }
          >
            <Trash2 className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="min-w-[220px]">
            <PopoverTitle>Delete &quot;{group.name}&quot;</PopoverTitle>
            <PopoverDescription>
              {taskCount === 1
                ? 'This group has 1 task.'
                : `This group has ${taskCount} tasks.`}
            </PopoverDescription>
            <div className="mt-1 flex flex-col gap-1.5">
              <Button variant="default" size="sm" onClick={handleMove}>
                Move tasks to General
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                Delete all tasks
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
