import { useState } from 'react'

import { useAppStore } from '@/app/store'
import type { Group } from '@/shared/types'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  Button,
} from '@/shared/ui'

export default function GroupSettings() {
  const groups = useAppStore((s) => s.groups)
  const addGroup = useAppStore((s) => s.addGroup)
  const renameGroup = useAppStore((s) => s.renameGroup)
  const deleteGroup = useAppStore((s) => s.deleteGroup)
  const [newGroupName, setNewGroupName] = useState('')

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    addGroup(name)
    setNewGroupName('')
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {groups.map((g) => (
          <GroupItem
            key={g.id}
            group={g}
            onRename={renameGroup}
            onDelete={deleteGroup}
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
          className="border-border bg-background text-foreground flex-1 rounded-[6px] border px-2.5 py-1.5 text-xs transition-colors duration-140 outline-none"
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
  onDelete,
  isLast,
}: {
  group: Group
  onRename: (id: string, name: string) => void
  onDelete: (id: string, reassignToDefault: boolean) => void
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== group.name) {
      onRename(group.id, trimmed)
    } else {
      setName(group.name)
    }
    setEditing(false)
  }

  return (
    <div className="border-border bg-background flex items-center gap-2 rounded-[6px] border px-2.5 py-2">
      <span
        className="h-[10px] w-[10px] shrink-0 rounded-full"
        style={{ background: group.color }}
      />
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
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
        <span
          className="text-foreground flex-1 text-[13.5px]"
          onClick={() => setEditing(true)}
        >
          {group.name}
        </span>
      )}
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="ghost" size="xs" disabled={isLast} />}
        >
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete &quot;{group.name}&quot;</AlertDialogTitle>
          <AlertDialogDescription>
            What should happen to tasks in this group?
          </AlertDialogDescription>
          <div className="flex flex-col gap-2">
            <AlertDialogCancel onClick={() => onDelete(group.id, true)}>
              Move tasks to General
            </AlertDialogCancel>
            <AlertDialogCancel
              variant="destructive"
              onClick={() => onDelete(group.id, false)}
            >
              Delete all tasks
            </AlertDialogCancel>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
