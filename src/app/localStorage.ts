import { DEFAULT_APP_SETTINGS } from '@/shared/types'
import type { Task } from '@/shared/types'
import type { Group } from '@/shared/types'
import type { AppSettings } from '@/shared/types'

const CURRENT_VERSION = 1

export interface ExportData {
  version: number
  exportedAt: string
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
}

export function exportData(
  tasks: Task[],
  groups: Group[],
  settings: AppSettings,
): string {
  const data: ExportData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    groups,
    settings,
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

export interface ImportResult {
  success: boolean
  data?: {
    tasks: Task[]
    groups: Group[]
    settings: AppSettings
  }
  error?: string
  warnings?: string[]
}

export function parseImport(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString)

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format.' }
    }

    // Support both new format (flat keys) and old format (appStore wrapper)
    const source = parsed.appStore || parsed

    const tasks: Task[] = source.tasks ?? []
    const groups: Group[] = source.groups ?? []
    const settings: AppSettings = source.settings ?? DEFAULT_APP_SETTINGS

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
      data: { tasks, groups, settings },
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch {
    return { success: false, error: 'Corrupted file. Could not parse JSON.' }
  }
}
