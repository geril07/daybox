import { useState } from 'react'
import { AlertDialog } from '@base-ui/react'
import { useAppStore } from '../../app/store'
import type { Group } from '../../shared/types'

export default function GroupSettings() {
  const groups = useAppStore(s => s.groups)
  const addGroup = useAppStore(s => s.addGroup)
  const renameGroup = useAppStore(s => s.renameGroup)
  const deleteGroup = useAppStore(s => s.deleteGroup)
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
        {groups.map(g => (
          <GroupItem key={g.id} group={g} onRename={renameGroup} onDelete={deleteGroup} isLast={groups.length <= 1} />
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        <input
          type="text"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
          placeholder="Add group..."
          className="flex-1 px-2.5 py-1.5 text-xs rounded-[6px] outline-none transition-border duration-140"
          style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--bg)' }}
        />
        <button
          className="px-3.5 py-1.5 text-xs font-medium rounded-[6px] text-white transition-opacity duration-140"
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
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-[6px]" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <span className="w-[10px] h-[10px] rounded-full shrink-0" style={{ background: group.color }} />
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setName(group.name); setEditing(false) }
          }}
          className="flex-1 text-xs bg-transparent border-none outline-none"
          style={{ color: 'var(--fg)' }}
          autoFocus
        />
      ) : (
        <span className="flex-1 text-[13.5px]" style={{ color: 'var(--fg)' }} onClick={() => setEditing(true)}>
          {group.name}
        </span>
      )}
      <AlertDialog.Root>
        <AlertDialog.Trigger
          disabled={isLast}
          className="text-xs px-[7px] py-[3px] rounded-[4px] transition-all duration-120 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: isLast ? 'var(--fg-3)' : 'var(--fg-3)' }}
        >
          Delete
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50" style={{ background: 'oklch(0 0 0 / 0.25)' }} />
          <AlertDialog.Popup
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[10px] p-5 shadow-lg max-w-[85vw]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              Delete &quot;{group.name}&quot;
            </AlertDialog.Title>
            <AlertDialog.Description className="text-xs mb-4" style={{ color: 'var(--fg-2)' }}>
              What should happen to tasks in this group?
            </AlertDialog.Description>
            <div className="flex flex-col gap-2">
              <AlertDialog.Close
                className="w-full text-xs py-2 rounded-[6px] font-medium transition-all duration-120"
                style={{ background: 'var(--accent)', color: 'white' }}
                onClick={() => onDelete(group.id, true)}
              >
                Move tasks to General
              </AlertDialog.Close>
              <AlertDialog.Close
                className="w-full text-xs py-2 rounded-[6px] transition-all duration-120"
                style={{ border: '1px solid var(--overdue-border)', color: 'var(--overdue)' }}
                onClick={() => onDelete(group.id, false)}
              >
                Delete all tasks
              </AlertDialog.Close>
              <AlertDialog.Close
                className="w-full text-xs py-2 rounded-[6px] transition-all duration-120"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-3)' }}
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
