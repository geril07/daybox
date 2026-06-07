import { z } from 'zod'

import { setTheme } from '@/app/theme'
import { useGroupStore, type Group, GroupSchema } from '@/features/groups'
import { usePlannerStore, type WeekStartDay } from '@/features/planner'
import { useTaskStore, type Task, TaskSchema } from '@/features/tasks'
import { useTimerStore, type TimerSettings } from '@/features/timer'
import { safeParseAndRoute } from '@/shared/utils/import-validation'

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
      const migratedTasks: Task[] = []
      for (const raw of state.tasks) {
        const record = safeParseAndRoute({
          value: raw,
          schema: TaskSchema,
          layer: 'record',
        })
        if (record.ok) {
          migratedTasks.push(record.data)
        } else {
          console.warn('[daybox] Legacy task dropped:', record.reason)
        }
      }
      if (migratedTasks.length > 0) {
        useTaskStore.setState({ tasks: migratedTasks })
      }
    }
    if (state.groups && state.groups.length > 0) {
      const migratedGroups: Group[] = []
      for (const raw of state.groups) {
        const record = safeParseAndRoute({
          value: raw,
          schema: GroupSchema,
          layer: 'record',
        })
        if (record.ok) {
          migratedGroups.push(record.data)
        } else {
          console.warn('[daybox] Legacy group dropped:', record.reason)
        }
      }
      if (migratedGroups.length > 0) {
        useGroupStore.setState({ groups: migratedGroups })
      }
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
