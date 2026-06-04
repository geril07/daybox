import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react'
import type { ReactNode } from 'react'

export interface DialogAction {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  trigger?: ReactNode
  actions: DialogAction[]
}

const variantStyles = {
  primary: {
    className:
      'w-full rounded-[6px] py-2 text-xs font-medium transition-all duration-120 text-white',
    style: { background: 'var(--accent)' },
  },
  secondary: {
    className: 'w-full rounded-[6px] py-2 text-xs transition-all duration-120',
    style: { border: '1px solid var(--border)', color: 'var(--fg-3)' },
  },
  danger: {
    className: 'w-full rounded-[6px] py-2 text-xs transition-all duration-120',
    style: {
      border: '1px solid var(--overdue-border)',
      color: 'var(--overdue)',
    },
  },
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  actions,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogPrimitive.Trigger>{trigger}</AlertDialogPrimitive.Trigger>
      )}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className="fixed inset-0 z-50"
          style={{ background: 'oklch(0 0 0 / 0.25)' }}
        />
        <AlertDialogPrimitive.Popup
          className="fixed top-1/2 left-1/2 z-50 max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-[10px] p-5 shadow-lg"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <AlertDialogPrimitive.Title
            className="mb-2 text-sm font-semibold"
            style={{ color: 'var(--fg)' }}
          >
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            className="mb-4 text-xs"
            style={{ color: 'var(--fg-2)' }}
          >
            {description}
          </AlertDialogPrimitive.Description>
          <div className="flex flex-col gap-2">
            {actions.map((action) => {
              const variant = variantStyles[action.variant ?? 'secondary']
              return (
                <AlertDialogPrimitive.Close
                  key={action.label}
                  className={variant.className}
                  style={variant.style}
                  onClick={action.onClick}
                >
                  {action.label}
                </AlertDialogPrimitive.Close>
              )
            })}
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
