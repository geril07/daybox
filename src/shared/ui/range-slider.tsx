import { Slider } from '@base-ui/react'
import { forwardRef } from 'react'

import { cn } from '../lib/utils'

interface RangeSliderProps {
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step: number
  className?: string
}

const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(
  ({ value, onValueChange, min, max, step, className }, ref) => {
    return (
      <Slider.Root
        ref={ref}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        className={cn('flex h-5 w-[80px] items-center', className)}
      >
        <Slider.Track
          className="relative h-[4px] w-full rounded-full"
          style={{ background: 'var(--border)' }}
        >
          <Slider.Indicator
            className="h-full rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <Slider.Thumb
            className="absolute top-1/2 block h-[14px] w-[14px] -translate-y-1/2 rounded-full shadow-sm"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
            }}
          />
        </Slider.Track>
      </Slider.Root>
    )
  },
)
RangeSlider.displayName = 'RangeSlider'

export { RangeSlider }
export type { RangeSliderProps }
