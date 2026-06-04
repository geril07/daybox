import { describe, it, expect } from 'vitest'

import { exportData, parseImport } from '@/app/localStorage'
import type { Task, Group, AppSettings } from '@/shared/types'

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
    color: 'oklch(0.545 0.185 28)',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const defaultSettings: AppSettings = {
  timer: {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    alarmSound: 'bell',
    alarmVolume: 0.5,
    alarmRepeat: 3,
  },
  theme: 'light',
  weekStartDay: 1,
}

describe('Export/Import', () => {
  it('exports data', () => {
    const tasks = [createTask({ id: '1' })]
    const groups = [createGroup({ id: 'default' })]
    const json = exportData(tasks, groups, defaultSettings)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.tasks).toHaveLength(1)
  })

  it('imports valid data', () => {
    const data = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: [createTask({ id: '1', title: 'Imported' })],
      groups: [createGroup({ id: 'default' })],
    })
    const result = parseImport(data)
    expect(result.success).toBe(true)
    expect(result.data?.tasks).toHaveLength(1)
    expect(result.data?.tasks![0].title).toBe('Imported')
  })

  it('handles corrupted import', () => {
    const result = parseImport('not json')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
