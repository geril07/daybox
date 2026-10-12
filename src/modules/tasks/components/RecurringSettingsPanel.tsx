import { ArrowUp, ArrowDown, ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { DEFAULT_GROUP_ID, GroupSelect, useGroupStore } from '@/modules/groups'
import { usePlannerStore } from '@/modules/planner'
import {
  Button,
  NumberInput,
  Switch,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/shared/ui'

import { useTaskStore } from '../store'
import type { Series } from '../types'

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Weekdays({
  value,
  onChange,
}: {
  value: number[]
  onChange: (days: number[]) => void
}) {
  const weekStartDay = usePlannerStore((state) => state.weekStartDay)
  return (
    <div className="grid grid-cols-7 gap-1" aria-label="Weekdays">
      {Array.from({ length: 7 }, (_, index) => (weekStartDay + index) % 7).map(
        (day) => (
          <Button
            key={day}
            type="button"
            size="sm"
            className="h-8 min-w-0 px-0"
            variant={value.includes(day) ? 'default' : 'outline'}
            aria-pressed={value.includes(day)}
            onClick={() =>
              onChange(
                value.includes(day)
                  ? value.filter((item) => item !== day)
                  : [...value, day],
              )
            }
          >
            {days[day]}
          </Button>
        ),
      )}
    </div>
  )
}

function SeriesRow({
  series,
  index,
  ordered,
}: {
  series: Series
  index: number
  ordered: Series[]
}) {
  const [title, setTitle] = useState(series.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const groups = useGroupStore((state) => state.groups)
  const group = groups.find((item) => item.id === series.groupId)
  const tasks = useTaskStore((state) => state.tasks)
  const updateSeries = useTaskStore((state) => state.updateSeries)
  const count = tasks.filter((task) => task.seriesId === series.id).length
  const rename = () => {
    if (title.trim().length < 1 || title.trim().length > 280) return
    updateSeries(series.id, { title })
  }
  const move = (offset: number) => {
    const ids = ordered.map((item) => item.id)
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    useTaskStore.getState().reorderSeries(ids)
  }
  return (
    <div
      className="border-border flex min-w-0 flex-col gap-3 rounded border p-3"
      role="group"
      aria-label={series.title}
    >
      <input
        aria-label="Recurring task title"
        value={title}
        maxLength={280}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={rename}
        onKeyDown={(event) => {
          if (event.key === 'Enter') rename()
          if (event.key === 'Escape') setTitle(series.title)
        }}
        className="border-border bg-background w-full min-w-0 rounded border px-2 py-1.5 text-sm"
      />
      <Weekdays
        value={series.weekdays}
        onChange={(weekdays) => updateSeries(series.id, { weekdays })}
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Group</span>
          <GroupSelect
            groups={groups}
            groupId={series.groupId}
            onChange={(groupId) => updateSeries(series.id, { groupId })}
            triggerProps={{
              'aria-label': `Group: ${group?.name ?? 'Group'}`,
              className:
                'border-border bg-background flex h-7 min-w-0 items-center gap-2 rounded border px-2 text-sm',
            }}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: group?.color }}
            />
            <span className="min-w-0 truncate">{group?.name ?? 'Group'}</span>
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-3 shrink-0"
            />
          </GroupSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">
            Estimated pomodoros
          </span>
          <NumberInput
            aria-label="Estimated pomodoros"
            value={series.pomoEstimate}
            min={0}
            max={99}
            onValueChange={(value) => {
              if (value !== null)
                updateSeries(series.id, { pomoEstimate: value })
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <label className="mr-auto flex items-center gap-2 text-sm">
          <Switch
            checked={series.active}
            onCheckedChange={(active) =>
              useTaskStore.getState().setSeriesActive(series.id, active)
            }
          />
          Active
        </label>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger
            render={
              <Button size="icon-sm" variant="ghost" disabled={index === 0} />
            }
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => move(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Move up</TooltipContent>
        </Tooltip>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={index === ordered.length - 1}
              />
            }
            aria-label="Move down"
            disabled={index === ordered.length - 1}
            onClick={() => move(1)}
          >
            <ArrowDown aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Move down</TooltipContent>
        </Tooltip>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger
            render={<Button size="icon-sm" variant="ghostDestructive" />}
            aria-label="Delete recurring task"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Delete recurring task</TooltipContent>
        </Tooltip>
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete recurring task?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes “{series.title}” and all {count} generated tasks. This
            cannot be undone.
          </AlertDialogDescription>
          <AlertDialogAction
            onClick={() => useTaskStore.getState().deleteSeries(series.id)}
          >
            Delete recurring task
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function RecurringSettingsPanel() {
  const series = useTaskStore((state) => state.series)
  const [title, setTitle] = useState('')
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6])
  const ordered = [...series].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="flex flex-col gap-3">
      {ordered.map((item, index) => (
        <SeriesRow
          key={item.id}
          series={item}
          index={index}
          ordered={ordered}
        />
      ))}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (
            useTaskStore
              .getState()
              .addSeries({ title, weekdays, groupId: DEFAULT_GROUP_ID })
          )
            setTitle('')
        }}
      >
        <input
          aria-label="New recurring task"
          placeholder="Recurring task title"
          value={title}
          maxLength={280}
          onChange={(event) => setTitle(event.target.value)}
          className="border-border bg-background rounded border px-2 py-1.5 text-sm"
        />
        <Weekdays value={weekdays} onChange={setWeekdays} />
        <Button
          type="submit"
          variant="outline"
          disabled={
            !title.trim() || title.trim().length > 280 || weekdays.length === 0
          }
        >
          Add recurring task
        </Button>
      </form>
    </div>
  )
}
