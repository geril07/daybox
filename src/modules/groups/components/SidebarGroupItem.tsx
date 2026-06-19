import { Check, MoreHorizontal, Palette, Pencil, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { DEFAULT_GROUP_ID, GROUP_COLORS, type Group } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { CustomColorInput } from './CustomColorInput'

interface SidebarGroupItemProps {
  group: Group
  isActive: boolean
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onSetColor: (id: string, color: string) => void
  onDelete: (id: string) => void
  onResolveAndDelete: (id: string, reassignToDefault: boolean) => void
  isLast: boolean
}

export function SidebarGroupItem({
  group,
  isActive,
  onSelect,
  onRename,
  onSetColor,
  onDelete,
  onResolveAndDelete,
  isLast,
}: SidebarGroupItemProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const [resolvePopoverOpen, setResolvePopoverOpen] = useState(false)
  const editingControlsRef = useRef<HTMLDivElement>(null)

  const taskCount = useTaskStore(
    (s) => s.tasks.filter((t) => t.groupId === group.id).length,
  )
  const hasTasks = taskCount > 0
  const isDefault = group.id === DEFAULT_GROUP_ID
  const deleteDisabled = isLast || isDefault

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== group.name) {
      onRename(group.id, trimmed)
    } else {
      setName(group.name)
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setName(group.name)
    setEditing(false)
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleSave()
  }

  const handleCancelEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleCancelEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(group.id)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteDisabled) return
    setMenuOpen(false)
    if (!hasTasks) {
      onDelete(group.id)
      return
    }
    setResolvePopoverOpen(true)
  }

  const handleMove = () => {
    onResolveAndDelete(group.id, true)
    setResolvePopoverOpen(false)
  }

  const handleDeleteAll = () => {
    onResolveAndDelete(group.id, false)
    setResolvePopoverOpen(false)
  }

  const handleCancelResolve = () => {
    setResolvePopoverOpen(false)
  }

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation()

    setMenuOpen(false)
    setEditing(true)
    setName(group.name)
  }

  const handleOpenColorFromMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setColorPopoverOpen(true)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      className={cn(
        'group/row flex cursor-pointer items-center justify-start gap-2.5 rounded-md px-2 py-2 text-sm font-medium outline-none',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      )}
      onClick={() => onSelect(group.id)}
      onKeyDown={handleRowKeyDown}
    >
      <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Change group color"
              title="Change color"
              className="ring-offset-background hover:ring-border size-[11px] shrink-0 cursor-pointer rounded-full transition-colors hover:ring-2"
              style={{ background: group.color }}
              onClick={(e) => e.stopPropagation()}
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
            <CustomColorInput
              value={group.color}
              onCommit={(c) => onSetColor(group.id, c)}
            />
            <span className="text-muted-foreground text-xs">Custom</span>
          </div>
        </PopoverContent>
      </Popover>

      {editing ? (
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => {
            if (
              e.relatedTarget?.closest('[data-cancel]') ||
              e.relatedTarget?.closest('[data-submit]')
            ) {
              return
            }

            handleSave()
          }}
          onKeyDown={handleKeyDown}
          className="text-foreground min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{group.name}</span>
      )}

      {editing && (
        <div
          className="flex shrink-0 items-center gap-1"
          ref={editingControlsRef}
        >
          <Button
            variant="ghost"
            size="icon-xs"
            data-cancel
            aria-label="Cancel rename"
            title="Cancel"
            onClick={handleCancelEditClick}
          >
            <X className="size-3.5" />
          </Button>
          <Button
            variant="none"
            size="icon-xs"
            data-submit
            aria-label="Confirm rename"
            title="Confirm"
            className="text-primary hover:bg-primary/10"
            onClick={handleSaveClick}
          >
            <Check className="size-3.5" />
          </Button>
        </div>
      )}

      <Popover open={resolvePopoverOpen} onOpenChange={setResolvePopoverOpen}>
        <Menu open={menuOpen} onOpenChange={setMenuOpen}>
          <MenuTrigger
            aria-label="Group actions"
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-6 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity duration-120 outline-none group-hover/row:opacity-100 pointer-coarse:opacity-100',
              editing && 'hidden',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </MenuTrigger>
          <MenuContent
            align="end"
            anchor={editing ? editingControlsRef : undefined}
            className="min-w-36 gap-0 p-1"
          >
            <MenuItem onClick={handleOpenColorFromMenu}>
              <Palette className="size-4" />
              Change color
            </MenuItem>
            <MenuItem onClick={handleStartRename}>
              <Pencil className="size-4" />
              Rename
            </MenuItem>
            <MenuItem
              onClick={handleDeleteClick}
              disabled={deleteDisabled}
              className="text-destructive data-highlighted:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>

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
            <Button variant="ghost" size="sm" onClick={handleCancelResolve}>
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
