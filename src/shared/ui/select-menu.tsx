import { Select } from '@base-ui/react'
import { forwardRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from '../lib/utils'

const SelectRoot = Select.Root

const SelectTrigger = forwardRef<HTMLDivElement, { children?: ReactNode; className?: string }>(
  ({ className, children, ...props }, ref) => (
    <Select.Trigger
      ref={ref}
      className={cn(
        'flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs',
        className,
      )}
      style={{
        border: '1px solid var(--border)',
        color: 'var(--fg-2)',
        background: 'var(--bg)',
      }}
      {...props}
    >
      {children ?? (
        <>
          <Select.Value />
          <Select.Icon>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Select.Icon>
        </>
      )}
    </Select.Trigger>
  ),
)
SelectTrigger.displayName = 'Select.Trigger'

const SelectValue = Select.Value

const SelectIcon = Select.Icon

const SelectPortal = Select.Portal

const SelectPositioner = Select.Positioner

interface SelectContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <Select.Popup
      ref={ref}
      className={cn(
        'min-w-[100px] rounded-[6px] py-1 shadow-lg',
        'data-starting-style:scale-[0.98] data-starting-style:opacity-0',
        'data-ending-style:scale-[0.98] data-ending-style:opacity-0',
        className,
      )}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      {...props}
    >
      {children}
    </Select.Popup>
  ),
)
SelectContent.displayName = 'Select.Content'

interface SelectItemProps extends ComponentPropsWithRef<'div'> {
  value: string
  children?: ReactNode
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <Select.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs',
        className,
      )}
      style={{ color: 'var(--fg-2)' }}
      {...props}
    >
      {children}
    </Select.Item>
  ),
)
SelectItem.displayName = 'Select.Item'

const SelectItemText = Select.ItemText

const SelectMenu = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Content: SelectContent,
  Item: SelectItem,
  ItemText: SelectItemText,
})

export {
  SelectMenu,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectContent,
  SelectItem,
  SelectItemText,
}
