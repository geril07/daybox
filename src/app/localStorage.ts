import { getTheme, setTheme, type Theme } from '@/app/theme'
import { useGroupStore } from '@/features/groups'
import type { Group } from '@/features/groups/types'
import { usePlannerStore, type WeekStartDay } from '@/features/planner'
import { useTaskStore } from '@/features/tasks'
import type { Task } from '@/features/tasks/types'
import {
  DEFAULT_TIMER_SETTINGS,
  useTimerStore,
  type TimerSettings,
} from '@/features/timer'

const CURRENT_VERSION = 3

interface PlannerExport {
  weekStartDay: WeekStartDay
  browseDate: string | null
}

export interface ExportData {
  version: number
  exportedAt: string
  tasks: Task[]
  groups: Group[]
  timer: TimerSettings
  planner: PlannerExport
  theme: Theme
}

export function exportData(): string {
  const planner = usePlannerStore.getState()
  const data: ExportData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: useTaskStore.getState().tasks,
    groups: useGroupStore.getState().groups,
    timer: useTimerStore.getState().settings,
    planner: {
      weekStartDay: planner.weekStartDay,
      browseDate: planner.browseDate,
    },
    theme: getTheme(),
  }
  return JSON.stringify(data, null, 2)
}

export function downloadExport(data: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'daybox-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

interface ImportPayload {
  tasks: Task[]
  groups: Group[]
  timer: TimerSettings
  planner: PlannerExport
  theme: Theme
}

export interface ImportResult {
  success: boolean
  data?: ImportPayload
  error?: string
  warnings?: string[]
}

function coerceTheme(value: unknown): Theme {
  return value === 'dark' ? 'dark' : 'light'
}

function coerceWeekStartDay(value: unknown): WeekStartDay {
  if (typeof value === 'number' && value >= 0 && value <= 6) {
    return value as WeekStartDay
  }
  return 1
}

function coerceTimerSettings(value: unknown): TimerSettings {
  if (!value || typeof value !== 'object') return DEFAULT_TIMER_SETTINGS
  return { ...DEFAULT_TIMER_SETTINGS, ...(value as Partial<TimerSettings>) }
}

export function parseImport(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString)

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format.' }
    }

    const version = typeof parsed.version === 'number' ? parsed.version : 3
    const source = parsed.appStore || parsed

    const tasks: Task[] = Array.isArray(source.tasks) ? source.tasks : []
    const groups: Group[] = Array.isArray(source.groups) ? source.groups : []

    let timer: TimerSettings
    let planner: PlannerExport
    let theme: Theme

    if (version === 2) {
      const settings = source.settings ?? {}
      timer = coerceTimerSettings(settings.timer)
      planner = {
        weekStartDay: coerceWeekStartDay(settings.weekStartDay),
        browseDate: null,
      }
      theme = coerceTheme(settings.theme)
    } else {
      timer = coerceTimerSettings(source.timer)
      const plannerSource =
        source.planner && typeof source.planner === 'object'
          ? source.planner
          : {}
      planner = {
        weekStartDay: coerceWeekStartDay(plannerSource.weekStartDay),
        browseDate:
          typeof plannerSource.browseDate === 'string'
            ? plannerSource.browseDate
            : null,
      }
      theme = coerceTheme(source.theme)
    }

    if (tasks.length === 0 && groups.length === 0) {
      return { success: false, error: 'No valid data found in file.' }
    }

    const warnings: string[] = []
    const taskGroupIds = new Set(tasks.map((t) => t.groupId))
    const existingGroupIds = new Set(groups.map((g) => g.id))
    for (const gid of taskGroupIds) {
      if (!existingGroupIds.has(gid)) {
        warnings.push(
          `Task group "${gid}" not found. Tasks reassigned to default group.`,
        )
      }
    }

    return {
      success: true,
      data: { tasks, groups, timer, planner, theme },
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch {
    return { success: false, error: 'Corrupted file. Could not parse JSON.' }
  }
}

export function applyImport(payload: ImportPayload): void {
  useTaskStore.setState({ tasks: payload.tasks })
  useGroupStore.setState({ groups: payload.groups })
  useTimerStore.getState().setTimerSettings(payload.timer)
  usePlannerStore.getState().setWeekStartDay(payload.planner.weekStartDay)
  usePlannerStore.getState().setBrowseDate(payload.planner.browseDate)
  setTheme(payload.theme)
}
