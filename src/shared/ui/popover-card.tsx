import { Popover as PopoverPrimitive } from '@base-ui/react'
import { forwardRef } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cn } from '../lib/utils'

const PopoverRoot = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverPortal = PopoverPrimitive.Portal

const PopoverPositioner = PopoverPrimitive.Positioner

interface PopoverContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, children, ...props }, ref) => (
    <PopoverPrimitive.Popup
      ref={ref}
      className={cn(
        'rounded-[10px] shadow-lg',
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
    </PopoverPrimitive.Popup>
  ),
)
PopoverContent.displayName = 'Popover.Content'

const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Content: PopoverContent,
})

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverContent,
}
