export interface Task {
  id: string
  title: string
  groupId: string
  date: string | null
  pomoEstimate: number
  pomoCompleted: number
  sortOrder: number
  completed: boolean
  completedAt: string | null
  createdAt: string
}

export interface Group {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface TimerSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  alarmSound: 'bell' | 'digital' | 'gentle' | 'ping'
  alarmVolume: number
  alarmRepeat: number
}

export interface AppSettings {
  timer: TimerSettings
  theme: 'light' | 'dark'
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export type View = 'today' | 'tomorrow' | 'week' | 'backlog' | 'date'

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: 'bell',
  alarmVolume: 0.5,
  alarmRepeat: 3,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  timer: DEFAULT_TIMER_SETTINGS,
  theme: 'light',
  weekStartDay: 1,
}

export const GROUP_COLORS = [
  'oklch(0.545 0.185 28)',
  'oklch(0.600 0.170 200)',
  'oklch(0.580 0.160 330)',
  'oklch(0.550 0.150 80)',
  'oklch(0.520 0.155 28)',
  'oklch(0.580 0.140 255)',
  'oklch(0.560 0.145 145)',
  'oklch(0.540 0.165 355)',
]
