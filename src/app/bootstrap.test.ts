import { describe, it, expect, beforeEach, vi } from 'vitest'

import { setTheme } from '@/app/theme'
import { useGroupStore } from '@/features/groups'
import { GROUP_COLORS, type Group } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore, type Task } from '@/features/tasks'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '@/features/timer'

function createTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 'Test',
    groupId: 'default',
    date: null,
    pomoEstimate: 0,
    pomoCompleted: 0,
    sortOrder: 0,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function createGroup(overrides: Partial<Group> & { id: string }): Group {
  return {
    name: 'General',
    color: GROUP_COLORS[0],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: GROUP_COLORS[0],
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
  })
  usePlannerStore.setState({ weekStartDay: 1, browseDate: null })
  setTheme('light')
})

describe('Legacy migrations', () => {
  it('migrates a valid daybox-app-store to the new feature stores', async () => {
    const { migrateLegacyAppStore } = await import('@/app/bootstrap')
    localStorage.setItem(
      'daybox-app-store',
      JSON.stringify({
        state: {
          tasks: [createTask({ id: 'legacy-1', title: 'Legacy' })],
          groups: [createGroup({ id: 'legacy-g' })],
        },
      }),
    )
    migrateLegacyAppStore()
    expect(localStorage.getItem('daybox-app-store')).toBeNull()
    expect(useTaskStore.getState().tasks.some((t) => t.id === 'legacy-1')).toBe(
      true,
    )
    expect(
      useGroupStore.getState().groups.some((g) => g.id === 'legacy-g'),
    ).toBe(true)
  })

  it('removes the daybox-app-store key and warns on invalid shape', async () => {
    const { migrateLegacyAppStore } = await import('@/app/bootstrap')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('daybox-app-store', 'not-valid-json-shape')
    migrateLegacyAppStore()
    expect(localStorage.getItem('daybox-app-store')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('migrates a valid daybox-settings to the new feature stores', async () => {
    const { migrateLegacySettings } = await import('@/app/bootstrap')
    localStorage.setItem(
      'daybox-settings',
      JSON.stringify({
        state: {
          settings: {
            timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 42 },
            weekStartDay: 0,
            theme: 'dark',
          },
        },
      }),
    )
    migrateLegacySettings()
    expect(localStorage.getItem('daybox-settings')).toBeNull()
    expect(useTimerStore.getState().settings.focusDuration).toBe(42)
    expect(usePlannerStore.getState().weekStartDay).toBe(0)
  })

  it('removes the daybox-settings key and warns on invalid shape', async () => {
    const { migrateLegacySettings } = await import('@/app/bootstrap')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('daybox-settings', 'not-valid-json-shape')
    migrateLegacySettings()
    expect(localStorage.getItem('daybox-settings')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
