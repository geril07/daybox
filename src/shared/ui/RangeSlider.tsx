import { Slider } from '@base-ui/react'

interface RangeSliderProps {
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step: number
}

export function RangeSlider({
  value,
  onValueChange,
  min,
  max,
  step,
}: RangeSliderProps) {
  return (
    <Slider.Root
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
      className="flex h-5 w-[80px] items-center"
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
}
