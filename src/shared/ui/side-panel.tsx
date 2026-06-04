import { Drawer } from '@base-ui/react'
import { forwardRef } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cn } from '../lib/utils'

const SidePanelRoot = Drawer.Root

const SidePanelTrigger = Drawer.Trigger

const SidePanelPortal = Drawer.Portal

const SidePanelOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithRef<'div'>
>(({ className, ...props }, ref) => (
  <Drawer.Backdrop
    ref={ref}
    className={cn(
      'fixed inset-0 min-h-dvh',
      'transition-opacity duration-300 ease-out',
      'data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0',
      className,
    )}
    style={{
      backgroundColor: 'black',
      opacity: 'calc(0.25*(1-var(--drawer-swipe-progress)))',
      backdropFilter: 'blur(2px)',
    }}
    {...props}
  />
))
SidePanelOverlay.displayName = 'SidePanel.Overlay'

interface SidePanelContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
  width?: number
}

const SidePanelContent = forwardRef<HTMLDivElement, SidePanelContentProps>(
  ({ className, children, width = 310, ...props }, ref) => (
    <Drawer.Viewport className="fixed inset-0 flex items-stretch justify-end">
      <Drawer.Popup
        ref={ref}
        className={cn(
          'flex touch-auto flex-col overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          'data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]',
          'data-swiping:select-none',
          '[transform:translateX(var(--drawer-swipe-movement-x))]',
          className,
        )}
        style={{
          width,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
        }}
        {...props}
      >
        {children}
      </Drawer.Popup>
    </Drawer.Viewport>
  ),
)
SidePanelContent.displayName = 'SidePanel.Content'

interface SidePanelHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

const SidePanelHeader = forwardRef<HTMLDivElement, SidePanelHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex shrink-0 items-center justify-between px-5 py-[18px]',
        className,
      )}
      style={{ borderBottom: '1px solid var(--border)' }}
      {...props}
    >
      {children}
    </div>
  ),
)
SidePanelHeader.displayName = 'SidePanel.Header'

const SidePanelTitle = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithRef<'span'>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    style={{ color: 'var(--fg)' }}
    {...props}
  />
))
SidePanelTitle.displayName = 'SidePanel.Title'

const SidePanelClose = Drawer.Close

const SidePanel = Object.assign(SidePanelRoot, {
  Trigger: SidePanelTrigger,
  Portal: SidePanelPortal,
  Overlay: SidePanelOverlay,
  Content: SidePanelContent,
  Header: SidePanelHeader,
  Title: SidePanelTitle,
  Close: SidePanelClose,
})

export {
  SidePanel,
  SidePanelTrigger,
  SidePanelPortal,
  SidePanelOverlay,
  SidePanelContent,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelClose,
}
