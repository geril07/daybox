import { NumberField } from '@base-ui/react'
import { forwardRef } from 'react'

import { cn } from '@/shared/lib/utils'

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
          <NumberField.Decrement
            className="flex h-7 w-7 items-center justify-center rounded-l-[4px] text-[14px]"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--fg-2)',
            }}
          >
            −
          </NumberField.Decrement>
          <NumberField.Input
            className="h-7 w-[44px] text-center text-xs outline-none"
            style={{
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              color: 'var(--fg)',
              background: 'var(--bg)',
            }}
          />
          <NumberField.Increment
            className="flex h-7 w-7 items-center justify-center rounded-r-[4px] text-[14px]"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--fg-2)',
            }}
          >
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
