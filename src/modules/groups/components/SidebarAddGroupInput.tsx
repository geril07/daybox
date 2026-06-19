import { Check, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

import { useGroupStore } from '@/modules/groups'
import { Button } from '@/shared/ui'

interface SidebarAddGroupInputProps {
  open: boolean
  onClose: () => void
}

export function SidebarAddGroupInput({
  open,
  onClose,
}: SidebarAddGroupInputProps) {
  const addGroup = useGroupStore((s) => s.addGroup)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) {
      addGroup(trimmed)
    }
    onClose()
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget
    if (
      related?.closest('[data-cancel]') ||
      related?.closest('[data-submit]')
    ) {
      return
    }
    submit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="bg-muted/30 flex items-center justify-between gap-2 rounded-md px-2 py-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Add group..."
        className="text-foreground min-w-0 flex-1 border-none bg-transparent px-0 py-0 text-sm outline-none"
      />
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          data-cancel
          aria-label="Cancel"
          title="Cancel"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
        <Button
          variant="none"
          size="icon-xs"
          data-submit
          aria-label="Confirm add group"
          title="Confirm add group"
          className="text-primary hover:bg-primary/10"
          onClick={submit}
        >
          <Check className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
