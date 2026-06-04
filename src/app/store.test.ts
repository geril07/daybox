import { describe, it, expect, beforeEach } from 'vitest'

import type { Task, Group } from '../shared/types'
import { exportData, parseImport } from './localStorage.ts'
import { useAppStore } from './store.ts'
import { useTimerStore, getNextPhase } from './timerStore.ts'

beforeEach(() => {
  useAppStore.setState({
    tasks: [],
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    settings: {
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
    },
    view: 'today',
    browseDate: null,
    focusedTaskId: null,
    stickyGroupId: null,
  })
})

describe('App Store - Task CRUD', () => {
  it('adds a task', () => {
    useAppStore.getState().addTask('Test task')
    const tasks = useAppStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Test task')
  })

  it('updates a task', () => {
    const task = useAppStore.getState().addTask('Test')
    useAppStore.getState().updateTask(task.id, { title: 'Updated' })
    expect(useAppStore.getState().tasks[0].title).toBe('Updated')
  })

  it('deletes a task', () => {
    const task = useAppStore.getState().addTask('Test')
    useAppStore.getState().deleteTask(task.id)
    expect(useAppStore.getState().tasks).toHaveLength(0)
  })

  it('toggles task completion', () => {
    const task = useAppStore.getState().addTask('Test')
    useAppStore.getState().toggleTask(task.id)
    expect(useAppStore.getState().tasks[0].completed).toBe(true)
    useAppStore.getState().toggleTask(task.id)
    expect(useAppStore.getState().tasks[0].completed).toBe(false)
  })
})

describe('App Store - Group CRUD', () => {
  it('adds a group', () => {
    useAppStore.getState().addGroup('Work')
    const groups = useAppStore.getState().groups
    expect(groups).toHaveLength(2)
    expect(groups.some((g) => g.name === 'Work')).toBe(true)
  })

  it('renames a group', () => {
    const group = useAppStore.getState().groups[0]
    useAppStore.getState().renameGroup(group.id, 'Renamed')
    expect(useAppStore.getState().groups[0].name).toBe('Renamed')
  })

  it('deletes a group and reassigns tasks', () => {
    const group = useAppStore.getState().addGroup('Work')
    const task = useAppStore.getState().addTask('Test', group.id)
    useAppStore.getState().deleteGroup(group.id, true)
    const storedTask = useAppStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storedTask?.groupId).toBe('default')
  })
})

describe('App Store - Settings updates', () => {
  it('updates settings', () => {
    useAppStore.getState().updateSettings({ theme: 'dark' })
    expect(useAppStore.getState().settings.theme).toBe('dark')
  })

  it('updates timer settings', () => {
    useAppStore.getState().updateTimerSettings({ focusDuration: 30 })
    expect(useAppStore.getState().settings.timer.focusDuration).toBe(30)
  })
})

describe('Timer Store', () => {
  it('starts and pauses', () => {
    const store = useTimerStore.getState()
    store.start()
    expect(useTimerStore.getState().isRunning).toBe(true)
    store.pause()
    expect(useTimerStore.getState().isRunning).toBe(false)
  })

  it('resets', () => {
    const store = useTimerStore.getState()
    store.start()
    store.reset()
    expect(useTimerStore.getState().isRunning).toBe(false)
    expect(useTimerStore.getState().elapsed).toBe(0)
  })
})

describe('getNextPhase', () => {
  it('focus -> shortBreak before interval', () => {
    expect(getNextPhase('focus', 1, 4)).toBe('shortBreak')
  })

  it('focus -> longBreak at interval', () => {
    expect(getNextPhase('focus', 3, 4)).toBe('longBreak')
  })

  it('shortBreak -> focus', () => {
    expect(getNextPhase('shortBreak', 1, 4)).toBe('focus')
  })

  it('longBreak -> focus', () => {
    expect(getNextPhase('longBreak', 1, 4)).toBe('focus')
  })
})

describe('Export/Import', () => {
  it('exports data', () => {
    useAppStore.getState().addTask('Test')
    const state = useAppStore.getState()
    const json = exportData(state)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.appStore.tasks).toHaveLength(1)
  })

  it('imports valid data', () => {
    const data = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      appStore: {
        tasks: [
          {
            id: '1',
            title: 'Imported',
            groupId: 'default',
            date: null,
            pomoEstimate: 0,
            pomoCompleted: 0,
            sortOrder: 0,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        groups: [
          {
            id: 'default',
            name: 'General',
            color: 'oklch(0.545 0.185 28)',
            createdAt: new Date().toISOString(),
          },
        ],
      },
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
