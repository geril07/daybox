import { describe, it, expect, beforeEach, vi } from 'vitest'

import { DEFAULT_GROUP_ID, useGroupStore } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore, type Task } from '@/features/tasks'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '@/features/timer'

import { applySnapshot } from './apply'
import { slices } from './registry'

function createTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 'Test',
    groupId: DEFAULT_GROUP_ID,
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

beforeEach(() => {
  localStorage.clear()
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
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
})

describe('applySnapshot', () => {
  it('returns ok with no warnings on a clean apply', () => {
    const data = {
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [createTask({ id: '1' })],
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: '2026-06-07T00:00:00.000Z',
        },
      ],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
    }
    const result = applySnapshot(data)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings).toBeUndefined()
    expect(useTaskStore.getState().tasks).toHaveLength(1)
  })

  it('reassigns a dangling groupId to the default group and warns', () => {
    const data = {
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [createTask({ id: '1', groupId: 'missing-group' })],
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: '2026-06-07T00:00:00.000Z',
        },
      ],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
    }
    const result = applySnapshot(data)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings).toBeDefined()
    expect(
      result.warnings?.some((w) => w.toLowerCase().includes('not found')),
    ).toBe(true)
    expect(useTaskStore.getState().tasks[0]?.groupId).toBe(DEFAULT_GROUP_ID)
  })

  it('warns and skips a slice whose payload fails its schema', () => {
    const data = {
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [{ id: 'broken' }],
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: '2026-06-07T00:00:00.000Z',
        },
      ],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
    }
    const result = applySnapshot(data)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings?.some((w) => w.startsWith('tasks:'))).toBe(true)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('calls every slice apply in registry order', () => {
    const order: string[] = []
    const spies = slices.map((slice) =>
      vi.spyOn(slice, 'apply').mockImplementation((value) => {
        order.push(slice.name)
        if (Array.isArray(value)) {
          if (slice.name === 'tasks')
            useTaskStore.setState({ tasks: value as never })
          if (slice.name === 'groups')
            useGroupStore.setState({ groups: value as never })
        }
        if (slice.name === 'planner') {
          const v = value as { weekStartDay: number; browseDate: string | null }
          usePlannerStore.getState().setWeekStartDay(v.weekStartDay as never)
          usePlannerStore.getState().setBrowseDate(v.browseDate)
        }
        if (slice.name === 'timer') {
          useTimerStore.getState().setTimerSettings(value as never)
        }
      }),
    )

    const data = {
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [createTask({ id: '1' })],
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: '2026-06-07T00:00:00.000Z',
        },
      ],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
    }
    applySnapshot(data)

    expect(order).toEqual(['tasks', 'groups', 'timer', 'planner'])
    spies.forEach((spy) => spy.mockRestore())
  })
})
