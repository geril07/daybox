import { Popover } from '@base-ui/react'
import type { ReactNode } from 'react'

interface PopoverCardProps {
  trigger: ReactNode
  children: ReactNode
  className?: string
}

export function PopoverCard({
  trigger,
  children,
  className,
}: PopoverCardProps) {
  return (
    <Popover.Root>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-40">
          <Popover.Popup
            className={`rounded-[10px] shadow-lg ${className ?? 'p-3'}`}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
