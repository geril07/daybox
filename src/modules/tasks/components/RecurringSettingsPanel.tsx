import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
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
    <div className="flex flex-wrap gap-1" aria-label="Weekdays">
      {Array.from({ length: 7 }, (_, index) => (weekStartDay + index) % 7).map(
        (day) => (
          <Button
            key={day}
            type="button"
            size="sm"
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
  const weekStartDay = usePlannerStore((state) => state.weekStartDay)
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
    <AccordionItem
      value={series.id}
      className="border-border rounded border px-3"
      role="group"
      aria-label={series.title}
    >
      <AccordionTrigger className="min-w-0 hover:no-underline">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate">{series.title}</span>{' '}
          <span className="text-muted-foreground text-xs font-normal">
            {series.weekdays.length === 7
              ? 'Every day'
              : Array.from(
                  { length: 7 },
                  (_, index) => (weekStartDay + index) % 7,
                )
                  .filter((day) => series.weekdays.includes(day))
                  .map((day) => days[day])
                  .join(', ')}
            {!series.active && ' · Inactive'}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-3 pb-3">
        <input
          aria-label="Series title"
          value={title}
          maxLength={280}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={rename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') rename()
            if (event.key === 'Escape') setTitle(series.title)
          }}
          className="border-border bg-background w-full rounded border px-2 py-1.5 text-sm"
        />
        <Weekdays
          value={series.weekdays}
          onChange={(weekdays) => updateSeries(series.id, { weekdays })}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <GroupSelect
            groups={groups}
            groupId={series.groupId}
            onChange={(groupId) => updateSeries(series.id, { groupId })}
          >
            <span>
              {groups.find((group) => group.id === series.groupId)?.name ??
                'Group'}
            </span>
          </GroupSelect>
          <NumberInput
            aria-label="Series pomodoro estimate"
            value={series.pomoEstimate}
            min={0}
            max={99}
            onValueChange={(value) => {
              if (value !== null)
                updateSeries(series.id, { pomoEstimate: value })
            }}
          />
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
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Move series up"
            disabled={index === 0}
            onClick={() => move(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Move series down"
            disabled={index === ordered.length - 1}
            onClick={() => move(1)}
          >
            <ArrowDown />
          </Button>
          <Button
            size="icon-sm"
            variant="ghostDestructive"
            aria-label="Delete series"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </AccordionContent>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete series?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes “{series.title}” and {count} occurrences. This cannot
            be undone.
          </AlertDialogDescription>
          <AlertDialogAction
            onClick={() => useTaskStore.getState().deleteSeries(series.id)}
          >
            Delete series
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </AccordionItem>
  )
}

export function RecurringSettingsPanel() {
  const series = useTaskStore((state) => state.series)
  const [title, setTitle] = useState('')
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const ordered = [...series].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="flex flex-col gap-3">
      <Accordion
        aria-label="Recurring series"
        multiple
        value={expandedIds}
        onValueChange={setExpandedIds}
        className="gap-2"
      >
        {ordered.map((item, index) => (
          <SeriesRow
            key={item.id}
            series={item}
            index={index}
            ordered={ordered}
          />
        ))}
      </Accordion>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const created = useTaskStore
            .getState()
            .addSeries({ title, weekdays, groupId: DEFAULT_GROUP_ID })
          if (created) {
            setTitle('')
            setExpandedIds((ids) => [...ids, created.id])
          }
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
          Add series
        </Button>
      </form>
    </div>
  )
}
