import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react'
import { forwardRef } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cn } from '../lib/utils'

const AlertDialogRoot = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

interface AlertDialogOverlayProps extends ComponentPropsWithRef<'div'> {}

const AlertDialogOverlay = forwardRef<HTMLDivElement, AlertDialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Backdrop
      ref={ref}
      className={cn(
        'fixed inset-0 z-50',
        'data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      style={{ background: 'oklch(0 0 0 / 0.25)' }}
      {...props}
    />
  ),
)
AlertDialogOverlay.displayName = 'AlertDialog.Overlay'

interface AlertDialogContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <AlertDialogPrimitive.Popup
      ref={ref}
      className={cn(
        'fixed top-1/2 left-1/2 z-50 max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-[10px] p-5 shadow-lg',
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
    </AlertDialogPrimitive.Popup>
  ),
)
AlertDialogContent.displayName = 'AlertDialog.Content'

const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithRef<'h2'>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('mb-2 text-sm font-semibold', className)}
    style={{ color: 'var(--fg)' }}
    {...props}
  />
))
AlertDialogTitle.displayName = 'AlertDialog.Title'

const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithRef<'p'>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('mb-4 text-xs', className)}
    style={{ color: 'var(--fg-2)' }}
    {...props}
  />
))
AlertDialogDescription.displayName = 'AlertDialog.Description'

const AlertDialogClose = AlertDialogPrimitive.Close

const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Close: AlertDialogClose,
})

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
}
