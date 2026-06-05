import { z } from 'zod'

import { getTheme, setTheme, ThemeSchema } from '@/app/theme'
import { useGroupStore } from '@/features/groups'
import { GroupSchema } from '@/features/groups/schema'
import type { Group } from '@/features/groups/types'
import { usePlannerStore, type WeekStartDay } from '@/features/planner'
import { PlannerStateSchema } from '@/features/planner/schema'
import { useTaskStore } from '@/features/tasks'
import { TaskSchema } from '@/features/tasks/schema'
import type { Task } from '@/features/tasks/types'
import {
  DEFAULT_TIMER_SETTINGS,
  TimerSettingsSchema,
  useTimerStore,
  type TimerSettings,
} from '@/features/timer'
import { safeParseAndRoute } from '@/shared/utils/import-validation'

const CURRENT_VERSION = 3

const ExportV3Schema = z.object({
  version: z.literal(3),
  exportedAt: z.string(),
  tasks: z.array(z.any()),
  groups: z.array(z.any()),
  timer: z.any().optional(),
  planner: z.any().optional(),
  theme: z.any().optional(),
})

const ExportV2Schema = z.object({
  version: z.literal(2),
  exportedAt: z.string().optional(),
  tasks: z.array(z.any()),
  groups: z.array(z.any()),
  settings: z
    .object({
      timer: z.any().optional(),
      theme: z.any().optional(),
      weekStartDay: z.number().optional(),
    })
    .optional(),
  appStore: z.any().optional(),
})

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
  theme: string
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
  theme: string
}

export interface ImportResult {
  success: boolean
  data?: ImportPayload
  error?: string
  warnings?: string[]
}

export function parseImport(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString)

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Not a DayBox export file.' }
    }

    const version = parsed.version

    let source: unknown
    if (version === 2) {
      source = parsed.appStore || parsed
      const envelope = safeParseAndRoute({
        value: parsed,
        schema: ExportV2Schema,
        layer: 'envelope',
      })
      if (!envelope.ok) {
        return { success: false, error: 'Not a DayBox export file.' }
      }
    } else {
      source = parsed
      const envelope = safeParseAndRoute({
        value: parsed,
        schema: ExportV3Schema,
        layer: 'envelope',
      })
      if (!envelope.ok) {
        return { success: false, error: 'Not a DayBox export file.' }
      }
    }

    const sourceObj = source as Record<string, unknown>

    const warnings: string[] = []

    const rawTasks: unknown[] = Array.isArray(sourceObj.tasks)
      ? sourceObj.tasks
      : []
    const rawGroups: unknown[] = Array.isArray(sourceObj.groups)
      ? sourceObj.groups
      : []

    const groups: Group[] = []
    for (const raw of rawGroups) {
      const result = safeParseAndRoute({
        value: raw,
        schema: GroupSchema,
        layer: 'record',
      })
      if (result.ok) {
        groups.push(result.data)
      } else {
        warnings.push(`Group: ${result.reason}`)
      }
    }

    const tasks: Task[] = []
    for (const raw of rawTasks) {
      const result = safeParseAndRoute({
        value: raw,
        schema: TaskSchema,
        layer: 'record',
      })
      if (result.ok) {
        tasks.push(result.data)
      } else {
        warnings.push(`Task: ${result.reason}`)
      }
    }

    if (tasks.length === 0 && groups.length === 0) {
      return { success: false, error: 'No valid data found in file.' }
    }

    const existingGroupIds = new Set(groups.map((g) => g.id))
    const DEFAULT_GROUP_ID = 'default'
    for (const task of tasks) {
      if (!existingGroupIds.has(task.groupId)) {
        warnings.push(
          `Task group "${task.groupId}" not found. Tasks reassigned to default group.`,
        )
        task.groupId = DEFAULT_GROUP_ID
      }
    }

    let timer: TimerSettings
    let planner: PlannerExport
    let theme: string

    if (version === 2) {
      const settings =
        sourceObj.settings && typeof sourceObj.settings === 'object'
          ? (sourceObj.settings as Record<string, unknown>)
          : {}

      const timerResult = safeParseAndRoute({
        value: settings.timer,
        schema: TimerSettingsSchema,
        layer: 'optional',
        defaultValue: DEFAULT_TIMER_SETTINGS,
      })
      timer = timerResult.ok ? timerResult.data : DEFAULT_TIMER_SETTINGS

      const themeResult = safeParseAndRoute({
        value: settings.theme,
        schema: ThemeSchema,
        layer: 'optional',
        defaultValue: 'light',
      })
      theme = themeResult.ok ? themeResult.data : 'light'

      planner = {
        weekStartDay: (typeof settings.weekStartDay === 'number' &&
        settings.weekStartDay >= 0 &&
        settings.weekStartDay <= 6
          ? settings.weekStartDay
          : 1) as WeekStartDay,
        browseDate: null,
      }
    } else {
      const timerResult = safeParseAndRoute({
        value: sourceObj.timer,
        schema: TimerSettingsSchema,
        layer: 'optional',
        defaultValue: DEFAULT_TIMER_SETTINGS,
      })
      timer = timerResult.ok ? timerResult.data : DEFAULT_TIMER_SETTINGS

      const themeResult = safeParseAndRoute({
        value: sourceObj.theme,
        schema: ThemeSchema,
        layer: 'optional',
        defaultValue: 'light',
      })
      theme = themeResult.ok ? themeResult.data : 'light'

      const plannerSource =
        sourceObj.planner && typeof sourceObj.planner === 'object'
          ? (sourceObj.planner as Record<string, unknown>)
          : {}

      const plannerResult = safeParseAndRoute({
        value: plannerSource,
        schema: PlannerStateSchema,
        layer: 'optional',
        defaultValue: { weekStartDay: 1, browseDate: null },
      })
      planner = plannerResult.ok
        ? (plannerResult.data as PlannerExport)
        : { weekStartDay: 1 as WeekStartDay, browseDate: null }
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
  setTheme(payload.theme as 'light' | 'dark')
}

const LegacyAppStoreSchema = z.object({
  state: z
    .object({
      tasks: z.array(z.any()).optional(),
      groups: z.array(z.any()).optional(),
      settings: z.any().optional(),
    })
    .optional(),
})

export function migrateLegacyAppStore(): void {
  const raw = localStorage.getItem('daybox-app-store')
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    const result = LegacyAppStoreSchema.safeParse(parsed)
    if (!result.success) {
      console.warn(
        '[daybox] Legacy daybox-app-store failed validation; removing',
        result.error,
      )
      return
    }
    const state = result.data.state
    if (!state) return
    if (state.tasks && state.tasks.length > 0) {
      useTaskStore.setState({ tasks: state.tasks as Task[] })
    }
    if (state.groups && state.groups.length > 0) {
      useGroupStore.setState({ groups: state.groups as Group[] })
    }
    if (state.settings) {
      localStorage.setItem(
        'daybox-settings',
        JSON.stringify({ state: { settings: state.settings }, version: 0 }),
      )
    }
  } catch (error) {
    console.warn(
      '[daybox] Legacy daybox-app-store migration failed; removing',
      error,
    )
  } finally {
    localStorage.removeItem('daybox-app-store')
  }
}

const LegacySettingsSchema = z.object({
  state: z
    .object({
      settings: z
        .object({
          timer: z.any().optional(),
          weekStartDay: z.number().optional(),
          theme: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  settings: z.any().optional(),
})

export function migrateLegacySettings(): void {
  const raw = localStorage.getItem('daybox-settings')
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    const result = LegacySettingsSchema.safeParse(parsed)
    if (!result.success) {
      console.warn(
        '[daybox] Legacy daybox-settings failed validation; removing',
        result.error,
      )
      return
    }
    const settings = result.data.state?.settings ?? result.data.settings
    if (!settings) return
    if (settings.timer) {
      useTimerStore.getState().setTimerSettings(settings.timer as TimerSettings)
    }
    if (typeof settings.weekStartDay === 'number') {
      usePlannerStore
        .getState()
        .setWeekStartDay(settings.weekStartDay as WeekStartDay)
    }
    if (settings.theme === 'light' || settings.theme === 'dark') {
      setTheme(settings.theme)
    }
  } catch (error) {
    console.warn(
      '[daybox] Legacy daybox-settings migration failed; removing',
      error,
    )
  } finally {
    localStorage.removeItem('daybox-settings')
  }
}
