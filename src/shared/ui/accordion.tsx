import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('not-last:border-b', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  headerAction,
  ...props
}: AccordionPrimitive.Trigger.Props & { headerAction?: React.ReactNode }) {
  return (
    <AccordionPrimitive.Header
      className={
        headerAction
          ? 'grid grid-cols-[auto_auto_1fr] items-center gap-1'
          : 'flex'
      }
    >
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground relative flex flex-1 items-start justify-between gap-2 rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-colors outline-none hover:underline focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 motion-reduce:transition-none',
          className,
          headerAction &&
            'col-span-3 col-start-1 row-start-1 grid grid-cols-subgrid items-center gap-1',
        )}
        {...props}
      >
        {headerAction ? <span>{children}</span> : children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className={cn(
            'pointer-events-none shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180 motion-reduce:transition-none',
            headerAction && 'col-start-3 justify-self-end',
          )}
        />
      </AccordionPrimitive.Trigger>
      {headerAction && (
        <div className="relative col-start-2 row-start-1">{headerAction}</div>
      )}
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      {...props}
    >
      <div
        className={cn(
          '[&_a]:hover:text-foreground pt-0 pb-2.5 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
