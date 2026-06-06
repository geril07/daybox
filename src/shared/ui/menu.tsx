import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

function Menu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />
}

function MenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

function MenuContent({
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  anchor,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'anchor'
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 flex min-w-36 origin-(--transform-origin) flex-col gap-0 rounded-lg p-1 text-sm shadow-md ring-1 outline-hidden duration-100',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "data-highlighted:bg-muted data-highlighted:text-foreground relative flex w-full cursor-default items-center gap-2 rounded px-3 py-2 text-left text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function MenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />
}

function MenuRadioItem({
  className,
  children,
  closeOnClick = true,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      closeOnClick={closeOnClick}
      className={cn(
        "data-highlighted:bg-muted data-highlighted:text-foreground relative flex w-full cursor-default items-center gap-2 rounded py-2 pr-8 pl-3 text-left text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="pointer-events-none size-4" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  )
}

function MenuGroupLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      className={cn('text-muted-foreground px-3 py-1 text-xs', className)}
      {...props}
    />
  )
}

export {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
}
