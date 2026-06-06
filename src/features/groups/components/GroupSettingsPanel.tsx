import { useState } from 'react'

import { Check, Pencil, Trash2, X } from 'lucide-react'

import { DEFAULT_GROUP_ID, useGroupStore, type Group } from '@/features/groups'
import { useTaskStore } from '@/features/tasks'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  Button,
} from '@/shared/ui'

export function GroupSettingsPanel() {
  const groups = useGroupStore((s) => s.groups)
  const addGroup = useGroupStore((s) => s.addGroup)
  const renameGroup = useGroupStore((s) => s.renameGroup)
  const deleteGroup = useGroupStore((s) => s.deleteGroup)
  const [newGroupName, setNewGroupName] = useState('')

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    addGroup(name)
    setNewGroupName('')
  }

  const handleDeleteGroup = (groupId: string, reassignToDefault: boolean) => {
    const tasks = useTaskStore.getState().tasks
    if (reassignToDefault) {
      const taskIds = tasks
        .filter((t) => t.groupId === groupId)
        .map((t) => t.id)
      taskIds.forEach((id) =>
        useTaskStore.getState().updateTask(id, { groupId: DEFAULT_GROUP_ID }),
      )
    } else {
      const taskIds = tasks
        .filter((t) => t.groupId === groupId)
        .map((t) => t.id)
      taskIds.forEach((id) => useTaskStore.getState().deleteTask(id))
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
            onDelete={handleDeleteGroup}
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
    <div className="border-border bg-background flex items-center gap-2 rounded-xl border px-2.5 py-2">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: group.color }}
      />
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
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="ghostDestructive" size="xs" disabled={isLast} />}
          >
            <Trash2 className="size-3.5" />
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
    </div>
  )
}
