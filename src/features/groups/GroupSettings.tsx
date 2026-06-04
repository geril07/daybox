import { AlertDialog } from '@base-ui/react'
import { useState } from 'react'

import { useAppStore } from '../../app/store'
import type { Group } from '../../shared/types'

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
      <AlertDialog.Root>
        <AlertDialog.Trigger
          disabled={isLast}
          className="rounded-[4px] px-[7px] py-[3px] text-xs transition-all duration-120 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ color: isLast ? 'var(--fg-3)' : 'var(--fg-3)' }}
        >
          Delete
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop
            className="fixed inset-0 z-50"
            style={{ background: 'oklch(0 0 0 / 0.25)' }}
          />
          <AlertDialog.Popup
            className="fixed top-1/2 left-1/2 z-50 max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-[10px] p-5 shadow-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertDialog.Title
              className="mb-2 text-sm font-semibold"
              style={{ color: 'var(--fg)' }}
            >
              Delete &quot;{group.name}&quot;
            </AlertDialog.Title>
            <AlertDialog.Description
              className="mb-4 text-xs"
              style={{ color: 'var(--fg-2)' }}
            >
              What should happen to tasks in this group?
            </AlertDialog.Description>
            <div className="flex flex-col gap-2">
              <AlertDialog.Close
                className="w-full rounded-[6px] py-2 text-xs font-medium transition-all duration-120"
                style={{ background: 'var(--accent)', color: 'white' }}
                onClick={() => onDelete(group.id, true)}
              >
                Move tasks to General
              </AlertDialog.Close>
              <AlertDialog.Close
                className="w-full rounded-[6px] py-2 text-xs transition-all duration-120"
                style={{
                  border: '1px solid var(--overdue-border)',
                  color: 'var(--overdue)',
                }}
                onClick={() => onDelete(group.id, false)}
              >
                Delete all tasks
              </AlertDialog.Close>
              <AlertDialog.Close
                className="w-full rounded-[6px] py-2 text-xs transition-all duration-120"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--fg-3)',
                }}
              >
                Cancel
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
