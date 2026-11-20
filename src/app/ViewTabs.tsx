import { Calendar, CalendarDays, CalendarRange, Clock, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { View } from '@/modules/planner'
import { usePlannerStore } from '@/modules/planner'
import { useTaskStore } from '@/modules/tasks'
import {
  addDaysToDate,
  formatDate,
  getPlannerDate,
  getWeekDays,
} from '@/shared/dates'

interface ViewTab {
  label: string
  shortLabel: string
  value: View
  Icon: typeof Sun
}

const viewTabs: ViewTab[] = [
  { label: 'Today', shortLabel: 'Today', value: 'today', Icon: Sun },
  { label: 'Tomorrow', shortLabel: 'Tmrw', value: 'tomorrow', Icon: Calendar },
  {
    label: 'This Week',
    shortLabel: 'Week',
    value: 'week',
    Icon: CalendarRange,
  },
  { label: 'Later', shortLabel: 'Later', value: 'later', Icon: CalendarDays },
  {
    label: 'Unscheduled',
    shortLabel: 'Uns.',
    value: 'unscheduled',
    Icon: Clock,
  },
]

interface ViewTabsProps {
  value: View
  onChange: (value: View) => void
}

export function ViewTabs({ value, onChange }: ViewTabsProps) {
  const tasks = useTaskStore((s) => s.tasks)
  const weekStartDay = usePlannerStore((s) => s.weekStartDay)
  const dayStartMinutes = usePlannerStore((s) => s.dayStartMinutes)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const update = () => {
      const active = list.querySelector(
        '[aria-selected="true"]',
      ) as HTMLElement | null
      if (!active) return
      const parentRect = list.getBoundingClientRect()
      const rect = active.getBoundingClientRect()
      setIndicator({ left: rect.left - parentRect.left, width: rect.width })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(list)
    return () => ro.disconnect()
  }, [value])

  const counts = useMemo(() => {
    const now = new Date()
    const today = getPlannerDate(now, dayStartMinutes)
    const days = getWeekDays(weekStartDay, now, dayStartMinutes)
    const weekStart = formatDate(days[0])
    const weekEnd = formatDate(days[6])
    const lastDay = days[6]
    const firstAfter = new Date(lastDay)
    firstAfter.setDate(lastDay.getDate() + 1)
    const afterStart = formatDate(firstAfter)

    const tomorrow = addDaysToDate(today, 1)

    const result = {
      today: 0,
      tomorrow: 0,
      week: 0,
      later: 0,
      unscheduled: 0,
    }

    for (const task of tasks) {
      if (task.date === today) result.today++
      if (task.date === tomorrow) result.tomorrow++
      if (task.date !== null && task.date >= weekStart && task.date <= weekEnd)
        result.week++
      if (task.date !== null && task.date >= afterStart) result.later++
      if (task.date === null) result.unscheduled++
    }

    return result
  }, [tasks, weekStartDay, dayStartMinutes])

  return (
    <div
      ref={listRef}
      role="tablist"
      className="@container relative flex w-full items-stretch justify-between gap-0.5"
    >
      <div
        className="absolute inset-y-0 rounded-lg bg-[color-mix(in_oklch,var(--card)_95%,var(--fg)_5%)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {viewTabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className="focus-indicator aria-selected:text-foreground text-muted-foreground hover:text-foreground relative z-10 inline-flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-medium whitespace-nowrap transition-colors @min-[32rem]:flex-row @min-[32rem]:gap-1.5 @min-[32rem]:px-1.5 @min-[32rem]:py-2.5 @min-[32rem]:text-sm"
        >
          <tab.Icon className="size-3.5 shrink-0" />
          <span className="flex min-w-0 items-center gap-1">
            <span className="hidden @min-[32rem]:inline">{tab.label}</span>
            <span className="@min-[32rem]:hidden">{tab.shortLabel}</span>
            {counts[tab.value as keyof typeof counts] > 0 && (
              <span className="bg-card text-fg-2 ring-border-strong/30 rounded-full px-1 py-0.5 text-[10px] leading-none font-medium tabular-nums ring-1 @min-[32rem]:px-1.5">
                {counts[tab.value as keyof typeof counts]}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
