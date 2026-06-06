import { NumberField } from '@base-ui/react'
import { forwardRef } from 'react'

import { cn } from '@/shared/utils/cn'

interface NumberInputProps {
  value: number
  onValueChange: (value: number | null) => void
  min: number
  max: number
  className?: string
}

const NumberInput = forwardRef<HTMLDivElement, NumberInputProps>(
  ({ value, onValueChange, min, max, className }, ref) => {
    return (
      <NumberField.Root
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
      >
        <NumberField.Group className={cn('flex items-center gap-0', className)}>
          <NumberField.Decrement className="text-fg-2 border-border flex h-7 w-7 items-center justify-center rounded-l border text-sm data-disabled:opacity-40">
            −
          </NumberField.Decrement>
          <NumberField.Input className="border-border text-foreground bg-background h-7 w-11 border-y text-center text-xs outline-none" />
          <NumberField.Increment className="text-fg-2 border-border flex h-7 w-7 items-center justify-center rounded-r border text-sm data-disabled:opacity-40">
            +
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    )
  },
)
NumberInput.displayName = 'NumberInput'

export { NumberInput }
export type { NumberInputProps }
