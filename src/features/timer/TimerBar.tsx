import { useEffect, useRef } from 'react'

import { useAppStore } from '../../app/store'
import { useTimerStore, getNextPhase } from '../../app/timerStore'
import { sendNotification } from '../../shared/notifications'
import { playAlarm } from './alarm'

export default function TimerBar() {
  const focusedTaskId = useAppStore((s) => s.focusedTaskId)
  const tasks = useAppStore((s) => s.tasks)
  const settings = useAppStore((s) => s.settings.timer)
  const updateTask = useAppStore((s) => s.updateTask)
  const focusedTask = tasks.find((t) => t.id === focusedTaskId)

  const phase = useTimerStore((s) => s.phase)
  const isRunning = useTimerStore((s) => s.isRunning)
  const startedAt = useTimerStore((s) => s.startedAt)
  const elapsed = useTimerStore((s) => s.elapsed)
  const sessionPomoCount = useTimerStore((s) => s.sessionPomoCount)
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const reset = useTimerStore((s) => s.reset)
  const tick = useTimerStore((s) => s.tick)

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
    if (remainingMs <= 0 && isRunning) {
      if (!alarmPlayedRef.current) {
        alarmPlayedRef.current = true
        playAlarm(
          settings.alarmSound,
          settings.alarmVolume,
          settings.alarmRepeat,
        )
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

        const nextPhase = getNextPhase(
          phase,
          sessionPomoCount,
          settings.longBreakInterval,
        )

        const autoStart =
          (phase === 'focus' && settings.autoStartBreaks) ||
          (phase !== 'focus' && settings.autoStartPomodoros)

        const newSessionCount =
          nextPhase === 'longBreak' ||
          (nextPhase === 'shortBreak' && phase === 'focus')
            ? sessionPomoCount + 1
            : sessionPomoCount

        useTimerStore.setState({
          phase: nextPhase,
          elapsed: 0,
          startedAt: autoStart ? Date.now() : null,
          isRunning: autoStart,
          sessionPomoCount: nextPhase === 'focus' ? 0 : newSessionCount,
        })
      }
    }
  }, [
    remainingMs,
    isRunning,
    phase,
    focusedTask,
    sessionPomoCount,
    settings,
    updateTask,
  ])

  useEffect(() => {
    if (isRunning) {
      document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} — DayBox`
    } else {
      document.title = 'DayBox'
    }
  }, [isRunning, minutes, seconds])

  const handlePlayPause = () => {
    if (isRunning) {
      pause()
    } else {
      if (elapsed > 0) {
        start()
      } else {
        reset()
        start()
      }
    }
  }

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
    const nextPhase = getNextPhase(
      phase,
      sessionPomoCount,
      settings.longBreakInterval,
    )
    const newSessionCount =
      nextPhase === 'longBreak' ||
      (nextPhase === 'shortBreak' && phase === 'focus')
        ? sessionPomoCount + 1
        : sessionPomoCount
    useTimerStore.setState({
      phase: nextPhase,
      elapsed: 0,
      startedAt: null,
      isRunning: false,
      sessionPomoCount: nextPhase === 'focus' ? 0 : newSessionCount,
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
    <div
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        className="h-[2px] overflow-hidden"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="linear h-full rounded-r-[2px] transition-[width] duration-900"
          style={{ width: `${progress * 100}%`, background: phaseColor }}
        />
      </div>
      <div className="mx-auto flex max-w-[680px] items-center gap-3.5 px-7 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
          <span
            className="text-[10.5px] font-semibold tracking-[0.8px] uppercase"
            style={{ color: phaseColor }}
          >
            {phaseLabel}
          </span>
          <span
            className="truncate text-[12.5px]"
            style={{ color: focusedTask ? 'var(--fg-2)' : 'var(--fg-3)' }}
          >
            {focusedTask ? focusedTask.title : 'No task focused'}
          </span>
        </div>
        <span
          className="min-w-[80px] shrink-0 text-center text-[30px] font-medium tracking-[1px] transition-colors duration-300"
          style={{
            color: isIdle ? 'var(--fg-3)' : 'var(--fg)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-all duration-140"
            style={{ color: 'var(--fg-3)' }}
            onClick={handleReset}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--fg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--fg-3)'
            }}
            title="Reset"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full transition-all duration-140"
            style={{
              background: phaseColor,
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
            }}
            onClick={handlePlayPause}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.88'
              e.currentTarget.style.transform = 'scale(1.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          <button
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-all duration-140"
            style={{ color: 'var(--fg-3)' }}
            onClick={handleSkip}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--fg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--fg-3)'
            }}
            title="Skip"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>
        <div className="flex min-w-[40px] shrink-0 items-center gap-[3px]">
          {sessionDots.map((i) => (
            <span
              key={i}
              className="h-[6px] w-[6px] rounded-full"
              style={{
                background: phaseColor,
                opacity: i < sessionPomoCount ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
