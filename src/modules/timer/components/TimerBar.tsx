import { RotateCcw, RefreshCcw, Pause, Play, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useTaskStore } from '@/modules/tasks'
import {
  sendNotification,
  shouldFireIntervalEndNotification,
} from '@/shared/notifications'
import {
  Button,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
} from '@/shared/ui'
import { cn } from '@/shared/utils/cn'

import { playAlarm, togglePlayPauseWithClick } from '../alarm'
import { useTimerStore } from '../store'
import type { TimerPhase } from '../types'

export function TimerBar() {
  const focusedTaskId = useTimerStore((s) => s.focusedTaskId)
  const focusedTask = useTaskStore((s) =>
    focusedTaskId ? s.tasks.find((t) => t.id === focusedTaskId) : undefined,
  )
  const settings = useTimerStore((s) => s.settings)
  const updateTask = useTaskStore((s) => s.updateTask)

  const phase = useTimerStore((s) => s.phase)
  const isRunning = useTimerStore((s) => s.isRunning)
  const startedAt = useTimerStore((s) => s.startedAt)
  const elapsed = useTimerStore((s) => s.elapsed)
  const sessionPomoCount = useTimerStore((s) => s.sessionPomoCount)
  const reset = useTimerStore((s) => s.reset)
  const resetSession = useTimerStore((s) => s.resetSession)
  const setPhase = useTimerStore((s) => s.setPhase)
  const tick = useTimerStore((s) => s.tick)
  const advancePhase = useTimerStore((s) => s.advancePhase)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmPlayedRef = useRef(false)

  const durationMap: Record<string, number> = {
    focus: settings.focusDuration,
    shortBreak: settings.shortBreakDuration,
    longBreak: settings.longBreakDuration,
  }

  const durationMinutes = durationMap[phase] || settings.focusDuration
  const durationMs = durationMinutes * 60 * 1000
  const remainingMs = Math.max(0, durationMs - elapsed)
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const progress = 1 - remainingMs / durationMs

  const isIdle = !isRunning && startedAt === null && elapsed === 0

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tick()
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, tick])

  useEffect(() => {
    alarmPlayedRef.current = false
  }, [phase, startedAt])

  useEffect(() => {
    if (remainingMs > 0 || !isRunning || alarmPlayedRef.current) return
    alarmPlayedRef.current = true

    playAlarm(settings.alarmSound, settings.alarmVolume, settings.alarmRepeat)
    if (
      shouldFireIntervalEndNotification({
        documentVisible: document.visibilityState === 'visible',
        permission: getNotificationPermission(),
        enabled: settings.notificationsEnabled,
      })
    ) {
      sendNotification(
        phase === 'focus'
          ? 'Focus complete!'
          : `${phase === 'shortBreak' ? 'Short break' : 'Long break'} complete!`,
        focusedTask ? `Task: ${focusedTask.title}` : undefined,
        () => window.focus(),
      )
    }

    if (phase === 'focus' && focusedTask) {
      updateTask(focusedTask.id, {
        pomoCompleted: focusedTask.pomoCompleted + 1,
      })
    }

    const autoStart =
      (phase === 'focus' && settings.autoStartBreaks) ||
      (phase !== 'focus' && settings.autoStartPomodoros)

    advancePhase({
      autoStart,
      longBreakInterval: settings.longBreakInterval,
    })
  }, [
    remainingMs,
    isRunning,
    phase,
    focusedTask,
    settings,
    updateTask,
    advancePhase,
  ])

  useEffect(() => {
    if (isRunning) {
      document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} — DayBox`
    } else {
      document.title = 'DayBox'
    }
  }, [isRunning, minutes, seconds])

  const intervalDirty = isRunning || elapsed > 0
  const cycleDirty = sessionPomoCount > 0 || phase !== 'focus'
  const resetMode: 'restart' | 'session' | 'disabled' = intervalDirty
    ? 'restart'
    : cycleDirty
      ? 'session'
      : 'disabled'

  const handleReset = () => {
    if (resetMode === 'restart') {
      reset()
    } else if (resetMode === 'session') {
      resetSession()
    } else {
      return
    }
    alarmPlayedRef.current = false
  }

  const handleSelectPhase = (next: TimerPhase) => {
    setPhase(next)
    alarmPlayedRef.current = false
  }

  const handleSkip = () => {
    if (phase === 'focus' && focusedTask) {
      updateTask(focusedTask.id, {
        pomoCompleted: focusedTask.pomoCompleted + 1,
      })
    }
    advancePhase({
      autoStart: false,
      longBreakInterval: settings.longBreakInterval,
    })
    alarmPlayedRef.current = false
  }

  const phaseColor =
    phase === 'focus'
      ? 'var(--accent)'
      : phase === 'shortBreak'
        ? 'var(--break-color)'
        : 'var(--lbreak-color)'
  const phaseLabel =
    phase === 'focus'
      ? 'FOCUS'
      : phase === 'shortBreak'
        ? 'SHORT BREAK'
        : 'LONG BREAK'

  const sessionDots = Array.from(
    { length: settings.longBreakInterval },
    (_, i) => i,
  )

  // Ambient phase tint: focus stays neutral (bg-card), breaks get a faint
  // wash of their phase color so the mode reads at a glance.
  const tintBg =
    phase === 'focus'
      ? undefined
      : `color-mix(in oklch, ${phaseColor} 8%, var(--card))`

  const cycleLabel =
    phase === 'longBreak'
      ? 'long break'
      : `${sessionPomoCount} of ${settings.longBreakInterval}` +
        (sessionPomoCount + 1 >= settings.longBreakInterval
          ? ' · long next'
          : '')

  const phaseOptions: { value: TimerPhase; label: string }[] = [
    { value: 'focus', label: 'Focus' },
    { value: 'shortBreak', label: 'Short break' },
    { value: 'longBreak', label: 'Long break' },
  ]

  return (
    <div
      className="bg-card transition-colors duration-300"
      style={tintBg ? { background: tintBg } : undefined}
    >
      <div className="bg-border h-0.5 overflow-hidden">
        <div
          className="linear h-full rounded-r-xs transition-[width] duration-900"
          style={{ width: `${progress * 100}%`, background: phaseColor }}
        />
      </div>
      <div className="mx-auto flex max-w-[680px] flex-col gap-1 px-4 py-2.5 sm:px-7">
        <div>
          <PhaseChip
            label={phaseLabel}
            color={phaseColor}
            current={phase}
            options={phaseOptions}
            onSelect={handleSelectPhase}
          />
          <div className="grid grid-cols-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'min-w-20 shrink-0 font-mono text-3xl leading-none font-medium tracking-wide tabular-nums transition-colors duration-300',
                  isIdle ? 'text-fg-3' : 'text-fg',
                )}
              >
                {String(minutes).padStart(2, '0')}:
                {String(seconds).padStart(2, '0')}
              </span>
            </div>
            <div className="mx-auto flex items-center gap-1">
              <Button
                variant="none"
                size="none"
                disabled={resetMode === 'disabled'}
                className="text-muted-foreground hover:bg-bg-hover hover:text-fg h-[34px] w-[34px] rounded-full border-0 duration-140 disabled:pointer-events-none disabled:opacity-40"
                onClick={handleReset}
                title={resetMode === 'session' ? 'Reset session' : 'Restart'}
                aria-label={
                  resetMode === 'session' ? 'Reset session' : 'Restart'
                }
              >
                {resetMode === 'session' ? (
                  <RefreshCcw size={14} />
                ) : (
                  <RotateCcw size={14} />
                )}
              </Button>
              <Button
                variant="none"
                size="none"
                className="size-10 rounded-full border-0 text-white shadow-sm duration-140 hover:scale-105 hover:opacity-90"
                style={{ background: phaseColor }}
                onClick={togglePlayPauseWithClick}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </Button>
              <Button
                variant="none"
                size="none"
                className="text-muted-foreground hover:bg-bg-hover hover:text-fg h-[34px] w-[34px] rounded-full border-0 duration-140"
                onClick={handleSkip}
                title="Skip"
              >
                <SkipForward size={14} />
              </Button>
            </div>
            <div className="ms-auto flex min-w-0 shrink items-center gap-2">
              <div className="flex shrink-0 items-center gap-[3px]">
                {sessionDots.map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'size-1.5 rounded-full',
                      i < sessionPomoCount ? 'opacity-100' : 'opacity-50',
                    )}
                    style={{ background: phaseColor }}
                  />
                ))}
              </div>
              <span className="text-muted-foreground hidden truncate text-xs tabular-nums sm:block">
                {cycleLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-fg-3 shrink-0 text-xs font-semibold tracking-widest uppercase">
            Working on
          </span>
          <span
            className={cn(
              'truncate text-xs',
              focusedTask ? 'text-fg-2' : 'text-fg-3',
            )}
          >
            {focusedTask ? focusedTask.title : 'No task focused'}
          </span>
        </div>
      </div>
    </div>
  )
}

function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

function PhaseChip({
  label,
  color,
  current,
  options,
  onSelect,
}: {
  label: string
  color: string
  current: TimerPhase
  options: { value: TimerPhase; label: string }[]
  onSelect: (phase: TimerPhase) => void
}) {
  return (
    <Menu>
      <MenuTrigger
        className="flex w-fit cursor-pointer items-center rounded-md py-0.5 text-xs font-semibold tracking-widest uppercase transition-colors duration-140 outline-none"
        style={{ color }}
      >
        {label}
      </MenuTrigger>
      <MenuContent className="gap-0 p-1" align="start">
        <MenuRadioGroup
          value={current}
          onValueChange={(value) => onSelect(value as TimerPhase)}
        >
          {options.map((opt) => (
            <MenuRadioItem
              key={opt.value}
              value={opt.value}
              className="text-fg-2 data-checked:text-foreground"
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{
                  background:
                    opt.value === 'focus'
                      ? 'var(--accent)'
                      : opt.value === 'shortBreak'
                        ? 'var(--break-color)'
                        : 'var(--lbreak-color)',
                }}
              />
              {opt.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}
