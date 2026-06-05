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

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'

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
