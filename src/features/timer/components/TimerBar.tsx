import { RotateCcw, Pause, Play, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useTaskStore } from '@/features/tasks'
import { playAlarm, useTimerStore } from '@/features/timer'
import { cn } from '@/shared/utils/cn'
import { sendNotification } from '@/shared/notifications'
import { Button } from '@/shared/ui'

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
  const togglePlayPause = useTimerStore((s) => s.togglePlayPause)
  const reset = useTimerStore((s) => s.reset)
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
    sendNotification(
      phase === 'focus'
        ? 'Focus complete!'
        : `${phase === 'shortBreak' ? 'Short break' : 'Long break'} complete!`,
      focusedTask ? `Task: ${focusedTask.title}` : undefined,
    )

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

  const handleReset = () => {
    reset()
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

  return (
    <div className="bg-card border-border border-t">
      <div className="bg-border h-[2px] overflow-hidden">
        <div
          className="linear h-full rounded-r-[2px] transition-[width] duration-900"
          style={{ width: `${progress * 100}%`, background: phaseColor }}
        />
      </div>
      <div className="mx-auto flex max-w-[680px] items-center gap-3.5 px-7 py-2.5">
        <div className="flex w-full shrink-0 items-center justify-between gap-2.5">
          <div className="flex items-center">
            <span
              className={cn(
                'min-w-[80px] shrink-0 text-center font-mono text-[30px] font-medium tracking-[1px] transition-colors duration-300',
                isIdle ? 'text-fg-3' : 'text-fg',
              )}
            >
              {String(minutes).padStart(2, '0')}:
              {String(seconds).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="none"
                className="text-muted-foreground hover:bg-bg-hover hover:text-fg h-[34px] w-[34px] rounded-full border-0 duration-140"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw size={14} />
              </Button>
              <Button
                variant="ghost"
                size="none"
                className="h-[40px] w-[40px] rounded-full border-0 text-white shadow-sm duration-140 hover:scale-105 hover:opacity-90"
                style={{ background: phaseColor }}
                onClick={togglePlayPause}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="none"
                className="text-muted-foreground hover:bg-bg-hover hover:text-fg h-[34px] w-[34px] rounded-full border-0 duration-140"
                onClick={handleSkip}
                title="Skip"
              >
                <SkipForward size={14} />
              </Button>
              <div className="flex min-w-[40px] shrink-0 items-center gap-[3px]">
                {sessionDots.map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-[6px] w-[6px] rounded-full',
                      i < sessionPomoCount ? 'opacity-100' : 'opacity-50',
                    )}
                    style={{ background: phaseColor }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <span
              className="text-[10.5px] font-semibold tracking-[0.8px] uppercase"
              style={{ color: phaseColor }}
            >
              {phaseLabel}
            </span>
            <span
              className={cn(
                'truncate text-[12.5px]',
                focusedTask ? 'text-fg-2' : 'text-fg-3',
              )}
            >
              {focusedTask ? focusedTask.title : 'No task focused'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
