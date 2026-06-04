import { useState } from 'react'

import { useAppStore } from '../../app/store'
import type { Group } from '../../shared/types'
import { AlertDialog } from '../../shared/ui'

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
          className="transition-border flex-1 rounded-[6px] px-2.5 py-1.5 text-xs duration-140 outline-none"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            background: 'var(--bg)',
          }}
        />
        <button
          className="rounded-[6px] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity duration-140"
          style={{ background: 'var(--accent)' }}
          onClick={handleAddGroup}
        >
          Add
        </button>
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
    <div
      className="flex items-center gap-2 rounded-[6px] px-2.5 py-2"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
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
          className="flex-1 border-none bg-transparent text-xs outline-none"
          style={{ color: 'var(--fg)' }}
          autoFocus
        />
      ) : (
        <span
          className="flex-1 text-[13.5px]"
          style={{ color: 'var(--fg)' }}
          onClick={() => setEditing(true)}
        >
          {group.name}
        </span>
      )}
      <AlertDialog
        title={`Delete "${group.name}"`}
        description="What should happen to tasks in this group?"
        trigger={
          <button
            disabled={isLast}
            className="rounded-[4px] px-[7px] py-[3px] text-xs transition-all duration-120 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: 'var(--fg-3)' }}
          >
            Delete
          </button>
        }
        actions={[
          {
            label: 'Move tasks to General',
            onClick: () => onDelete(group.id, true),
            variant: 'primary',
          },
          {
            label: 'Delete all tasks',
            onClick: () => onDelete(group.id, false),
            variant: 'danger',
          },
          { label: 'Cancel', variant: 'secondary' },
        ]}
      />
    </div>
  )
}
