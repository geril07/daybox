import { Minus, Plus } from 'lucide-react'

import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { useTimerStore } from '../store'

export function CycleProgressPopover({
  label,
  color,
}: {
  label: string
  color: string
}) {
  const count = useTimerStore((s) => s.sessionPomoCount)
  const target = useTimerStore((s) => s.settings.longBreakInterval)
  const setCount = useTimerStore((s) => s.setSessionPomoCount)

  return (
    <Popover>
      <PopoverTrigger
        className="hover:bg-bg-hover focus-visible:ring-ring ms-auto flex min-h-11 min-w-11 items-center justify-end gap-2 rounded-md px-2 outline-none focus-visible:ring-2"
        aria-label={`Adjust cycle progress, ${count} of ${target} completed`}
        title="Adjust cycle progress"
        onKeyDown={(event) => {
          if (event.key === ' ') event.stopPropagation()
        }}
      >
        <span
          className="flex shrink-0 items-center gap-[3px]"
          aria-hidden="true"
        >
          {Array.from({ length: target }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-1.5 rounded-full',
                i < count ? 'opacity-100' : 'opacity-50',
              )}
              style={{ background: color }}
            />
          ))}
        </span>
        <span className="text-muted-foreground hidden truncate text-xs sm:block">
          {label.split(/(\d+)/).map((part, i) =>
            i % 2 === 1 ? (
              <span key={i} className="font-mono tabular-nums">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-64 gap-3 p-4"
        onKeyDown={(event) => {
          if (event.key === ' ') event.stopPropagation()
        }}
      >
        <PopoverTitle>Cycle progress</PopoverTitle>
        <PopoverDescription className="text-xs">
          Completed focus sessions before a long break. Changes pause the timer;
          task totals stay unchanged.
        </PopoverDescription>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="none"
            className="size-9 shrink-0"
            aria-label="Decrease cycle progress"
            disabled={count === 0}
            onClick={() => setCount(count - 1)}
          >
            <Minus size={16} />
          </Button>
          <span
            className="text-base font-medium tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {count} of {target}
          </span>
          <Button
            variant="outline"
            size="none"
            className="size-9 shrink-0"
            aria-label="Increase cycle progress"
            disabled={count >= target}
            onClick={() => setCount(count + 1)}
          >
            <Plus size={16} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
