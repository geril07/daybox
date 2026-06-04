import { Drawer } from '@base-ui/react'
import type { ReactNode } from 'react'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function SidePanel({ open, onClose, title, children }: SidePanelProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => !o && onClose()}
      swipeDirection="right"
    >
      <Drawer.Portal>
        <Drawer.Backdrop
          className="fixed inset-0 min-h-dvh bg-black opacity-[calc(0.25*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0"
          style={{ backdropFilter: 'blur(2px)' }}
        />
        <Drawer.Viewport className="fixed inset-0 flex items-stretch justify-end">
          <Drawer.Popup
            className="flex [transform:translateX(var(--drawer-swipe-movement-x))] touch-auto flex-col overflow-y-auto overscroll-contain transition-transform duration-300 ease-out data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)] data-swiping:select-none"
            style={{
              width: 310,
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-5 py-[18px]"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--fg)' }}
              >
                {title}
              </span>
              <Drawer.Close
                className="flex h-7 w-7 items-center justify-center rounded-[4px]"
                style={{ color: 'var(--fg-3)' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Drawer.Close>
            </div>
            <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-5">
              {children}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
