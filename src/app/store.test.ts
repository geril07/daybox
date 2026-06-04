import { describe, it, expect, beforeEach } from 'vitest'

import { exportData, parseImport } from '@/app/localStorage'
import { useGroupStore } from '@/features/groups/store'
import { useSettingsStore } from '@/features/settings/store'
import { useTaskStore } from '@/features/tasks/store'
import { useTimerStore, getNextPhase } from '@/features/timer/store'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
  useSettingsStore.setState({
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
  })
  useTimerStore.setState({
    phase: 'focus',
    startedAt: null,
    elapsed: 0,
    sessionPomoCount: 0,
    isRunning: false,
    focusedTaskId: null,
  })
})

describe('Task Store - CRUD', () => {
  it('adds a task', () => {
    useTaskStore.getState().addTask('Test task')
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Test task')
  })

  it('updates a task', () => {
    const task = useTaskStore.getState().addTask('Test')
    useTaskStore.getState().updateTask(task.id, { title: 'Updated' })
    expect(useTaskStore.getState().tasks[0].title).toBe('Updated')
  })

  it('deletes a task', () => {
    const task = useTaskStore.getState().addTask('Test')
    useTaskStore.getState().deleteTask(task.id)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('toggles task completion', () => {
    const task = useTaskStore.getState().addTask('Test')
    useTaskStore.getState().toggleTask(task.id)
    expect(useTaskStore.getState().tasks[0].completed).toBe(true)
    useTaskStore.getState().toggleTask(task.id)
    expect(useTaskStore.getState().tasks[0].completed).toBe(false)
  })
})

describe('Group Store - CRUD', () => {
  it('adds a group', () => {
    useGroupStore.getState().addGroup('Work')
    const groups = useGroupStore.getState().groups
    expect(groups).toHaveLength(2)
    expect(groups.some((g) => g.name === 'Work')).toBe(true)
  })

  it('renames a group', () => {
    const group = useGroupStore.getState().groups[0]
    useGroupStore.getState().renameGroup(group.id, 'Renamed')
    expect(useGroupStore.getState().groups[0].name).toBe('Renamed')
  })

  it('deletes a group and reassigns tasks', () => {
    const group = useGroupStore.getState().addGroup('Work')
    const task = useTaskStore.getState().addTask('Test', group.id)
    useGroupStore.getState().deleteGroup(group.id)
    useTaskStore
      .getState()
      .reassignTasks(group.id, useGroupStore.getState().getDefaultGroup()!.id)
    const storedTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storedTask?.groupId).toBe('default')
  })
})

describe('Settings Store', () => {
  it('updates settings', () => {
    useSettingsStore.getState().updateSettings({ theme: 'dark' })
    expect(useSettingsStore.getState().settings.theme).toBe('dark')
  })

  it('updates timer settings', () => {
    useSettingsStore.getState().updateTimerSettings({ focusDuration: 30 })
    expect(useSettingsStore.getState().settings.timer.focusDuration).toBe(30)
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

  it('sets focusedTaskId', () => {
    useTimerStore.getState().setFocusedTaskId('task-1')
    expect(useTimerStore.getState().focusedTaskId).toBe('task-1')
    useTimerStore.getState().setFocusedTaskId(null)
    expect(useTimerStore.getState().focusedTaskId).toBeNull()
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
    useTaskStore.getState().addTask('Test')
    const json = exportData(
      useTaskStore.getState().tasks,
      useGroupStore.getState().groups,
      useSettingsStore.getState().settings,
    )
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.tasks).toHaveLength(1)
  })

  it('imports valid data', () => {
    const data = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
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
