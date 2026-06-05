import { describe, it, expect, beforeEach } from 'vitest'

import { exportData, parseImport } from '@/app/localStorage'
import { setTheme } from '@/app/theme'
import { useGroupStore } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore } from '@/features/tasks'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '@/features/timer'
import { GROUP_COLORS } from '@/shared/types'
import type { Group, Task } from '@/shared/types'

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

describe('Export', () => {
  it('exports data with version 3 and the five sections', () => {
    useTaskStore.setState({ tasks: [createTask({ id: '1' })] })
    const json = exportData()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(3)
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.groups).toHaveLength(1)
    expect(parsed.timer).toEqual(DEFAULT_TIMER_SETTINGS)
    expect(parsed.planner).toEqual({ weekStartDay: 1, browseDate: null })
    expect(parsed.theme).toBe('light')
  })

  it('reflects current store values', () => {
    useTaskStore.setState({ tasks: [createTask({ id: '1' })] })
    useTimerStore.getState().setTimerSettings({ focusDuration: 45 })
    usePlannerStore.getState().setWeekStartDay(0)
    usePlannerStore.getState().setBrowseDate('2026-06-15')
    setTheme('dark')

    const parsed = JSON.parse(exportData())
    expect(parsed.timer.focusDuration).toBe(45)
    expect(parsed.planner.weekStartDay).toBe(0)
    expect(parsed.planner.browseDate).toBe('2026-06-15')
    expect(parsed.theme).toBe('dark')
  })

  it('does not include timer runtime state', () => {
    const parsed = JSON.parse(exportData())
    expect(parsed.timer.phase).toBeUndefined()
    expect(parsed.timer.isRunning).toBeUndefined()
    expect(parsed.timer.focusedTaskId).toBeUndefined()
  })
})

describe('Import v3', () => {
  it('parses a valid v3 file with all sections', () => {
    const data = JSON.stringify({
      version: 3,
      exportedAt: new Date().toISOString(),
      tasks: [createTask({ id: '1', title: 'Imported' })],
      groups: [createGroup({ id: 'default' })],
      timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 50 },
      planner: { weekStartDay: 0, browseDate: '2026-07-04' },
      theme: 'dark',
    })
    const result = parseImport(data)
    expect(result.success).toBe(true)
    expect(result.data?.tasks).toHaveLength(1)
    expect(result.data?.tasks[0].title).toBe('Imported')
    expect(result.data?.timer.focusDuration).toBe(50)
    expect(result.data?.planner.weekStartDay).toBe(0)
    expect(result.data?.planner.browseDate).toBe('2026-07-04')
    expect(result.data?.theme).toBe('dark')
  })

  it('falls back to defaults for missing sections', () => {
    const data = JSON.stringify({
      version: 3,
      exportedAt: new Date().toISOString(),
      tasks: [createTask({ id: '1' })],
      groups: [createGroup({ id: 'default' })],
    })
    const result = parseImport(data)
    expect(result.success).toBe(true)
    expect(result.data?.timer).toEqual(DEFAULT_TIMER_SETTINGS)
    expect(result.data?.planner).toEqual({
      weekStartDay: 1,
      browseDate: null,
    })
    expect(result.data?.theme).toBe('light')
  })
})

describe('Import v2 (legacy)', () => {
  it('migrates settings into per-feature payload sections', () => {
    const data = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks: [createTask({ id: '1' })],
      groups: [createGroup({ id: 'default' })],
      settings: {
        timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 35 },
        theme: 'dark',
        weekStartDay: 0,
      },
    })
    const result = parseImport(data)
    expect(result.success).toBe(true)
    expect(result.data?.timer.focusDuration).toBe(35)
    expect(result.data?.planner.weekStartDay).toBe(0)
    expect(result.data?.theme).toBe('dark')
  })

  it('handles a v2 file with no settings', () => {
    const data = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks: [createTask({ id: '1' })],
      groups: [createGroup({ id: 'default' })],
    })
    const result = parseImport(data)
    expect(result.success).toBe(true)
    expect(result.data?.timer).toEqual(DEFAULT_TIMER_SETTINGS)
    expect(result.data?.theme).toBe('light')
  })
})

describe('Import errors', () => {
  it('handles corrupted JSON', () => {
    const result = parseImport('not json')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects empty data', () => {
    const result = parseImport(
      JSON.stringify({ version: 3, tasks: [], groups: [] }),
    )
    expect(result.success).toBe(false)
  })
})
