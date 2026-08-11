import { useState } from 'react'

import {
  NumberInput,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import {
  defaultDurationForPhase,
  minDurationMinForElapsed,
  PHASE_DURATION_MAX,
  resolveIntervalDurationMin,
} from '../duration'
import { useTimerStore } from '../store'

export function IntervalDurationPopover({
  display,
  isIdle,
  isCustom,
  disabled,
}: {
  display: string
  isIdle: boolean
  isCustom: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const phase = useTimerStore((s) => s.phase)
  const settings = useTimerStore((s) => s.settings)
  const elapsed = useTimerStore((s) => s.elapsed)
  const intervalDurationMin = useTimerStore((s) => s.intervalDurationMin)
  const setIntervalDurationMin = useTimerStore((s) => s.setIntervalDurationMin)

  const phaseDefault = defaultDurationForPhase(phase, settings)
  const current = resolveIntervalDurationMin(
    phase,
    settings,
    intervalDurationMin,
  )
  const minAllowed = minDurationMinForElapsed(elapsed)
  const maxAllowed = PHASE_DURATION_MAX[phase]

  const clockClassName = cn(
    'min-w-20 shrink-0 font-mono text-3xl leading-none font-medium tracking-wide tabular-nums transition-colors duration-300',
    isIdle ? 'text-fg-3' : 'text-fg',
    isCustom && 'text-accent',
  )

  if (disabled) {
    return (
      <span
        className={clockClassName}
        aria-label={isCustom ? `${display}, custom duration` : display}
      >
        {display}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          clockClassName,
          'cursor-pointer rounded-md outline-none',
          'hover:bg-bg-hover focus-visible:ring-ring focus-visible:ring-2',
        )}
        aria-label="Adjust interval duration"
        title="Adjust interval duration"
      >
        <span aria-hidden="true">{display}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="z-50 min-w-[160px] gap-2 p-3"
      >
        <PopoverTitle className="text-sm font-medium">
          This interval only
        </PopoverTitle>
        <PopoverDescription className="text-muted-foreground text-xs">
          Default is {phaseDefault} min
          {isCustom ? (
            <>
              .{' '}
              <button
                type="button"
                className="text-accent cursor-pointer hover:underline"
                onClick={() => setIntervalDurationMin(null)}
              >
                Reset
              </button>
            </>
          ) : (
            '.'
          )}
        </PopoverDescription>
        <div className="flex justify-center">
          <NumberInput
            value={current}
            onValueChange={(v) => {
              if (v === null) {
                setIntervalDurationMin(null)
                return
              }
              setIntervalDurationMin(v)
            }}
            min={minAllowed}
            max={maxAllowed}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
