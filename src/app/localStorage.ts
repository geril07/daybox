import { DEFAULT_APP_SETTINGS } from '../shared/types'
import type { AppState } from './store'

const CURRENT_VERSION = 1

export interface ExportData {
  version: number
  exportedAt: string
  appStore: Omit<AppState, 'version'>
}

export function exportData(state: AppState): string {
  const data: ExportData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    appStore: {
      tasks: state.tasks,
      groups: state.groups,
      settings: state.settings,
      view: state.view,
      browseDate: state.browseDate,
      focusedTaskId: state.focusedTaskId,
      stickyGroupId: state.stickyGroupId,
    },
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
  data?: Partial<AppState>
  error?: string
  warnings?: string[]
}

export function parseImport(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString)

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format.' }
    }

    const { version, appStore } = parsed as {
      version?: number
      appStore?: Partial<AppState>
    }

    if (!appStore) {
      return { success: false, error: 'Invalid export: missing appStore.' }
    }

    const warnings: string[] = []

    const validKeys = [
      'tasks',
      'groups',
      'settings',
      'view',
      'browseDate',
      'focusedTaskId',
      'stickyGroupId',
    ]
    const importData: Partial<AppState> = {}

    for (const key of validKeys) {
      if (key in appStore) {
        ;(importData as Record<string, unknown>)[key] = (
          appStore as Record<string, unknown>
        )[key]
      }
    }

    const taskGroupIds = new Set((importData.tasks ?? []).map((t) => t.groupId))

    if (importData.groups) {
      const existingGroupIds = new Set(importData.groups.map((g) => g.id))
      for (const gid of taskGroupIds) {
        if (!existingGroupIds.has(gid)) {
          warnings.push(
            `Task group "${gid}" not found. Tasks reassigned to default group.`,
          )
        }
      }
    }

    if (version !== undefined && version > CURRENT_VERSION) {
      warnings.push(
        'Imported data is from a newer version. Known fields imported, extras may be ignored.',
      )
    }

    return {
      success: true,
      data: importData,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch {
    return { success: false, error: 'Corrupted file. Could not parse JSON.' }
  }
}

export function migrateState(
  data: Partial<AppState>,
  fromVersion: number,
  toVersion: number,
): Partial<AppState> {
  let migrated = { ...data }

  for (let v = fromVersion; v < toVersion; v++) {
    const migrationFn = migrations[v + 1]
    if (migrationFn) {
      migrated = migrationFn(migrated)
    }
  }

  return migrated
}

const migrations: Record<
  number,
  (state: Partial<AppState>) => Partial<AppState>
> = {
  1: (state) => ({
    ...state,
    settings: state.settings ?? DEFAULT_APP_SETTINGS,
    stickyGroupId:
      ((state as Record<string, unknown>).stickyGroupId as string | null) ??
      null,
  }),
}
