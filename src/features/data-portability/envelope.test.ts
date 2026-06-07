import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'

import { DEFAULT_GROUP_ID, useGroupStore } from '@/features/groups'
import { GroupSchema } from '@/features/groups'
import { usePlannerStore } from '@/features/planner'
import { useTaskStore, type Task } from '@/features/tasks'
import { TaskSchema } from '@/features/tasks'
import { DEFAULT_TIMER_SETTINGS, useTimerStore } from '@/features/timer'

import { CURRENT_VERSION, looseEnvelopeV3Schema } from './envelope'
import { applySnapshot, buildSnapshot, validateSnapshot } from './index'

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

describe('envelope schema', () => {
  it('requires version 3 and the four slice fields', () => {
    const valid = {
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [],
      groups: [],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
    }
    expect(looseEnvelopeV3Schema.safeParse(valid).success).toBe(true)
  })

  it('silently ignores an incoming theme field', () => {
    const result = looseEnvelopeV3Schema.safeParse({
      version: 3,
      exportedAt: '2026-06-07T00:00:00.000Z',
      tasks: [],
      groups: [],
      timer: DEFAULT_TIMER_SETTINGS,
      planner: { weekStartDay: 1, browseDate: null },
      theme: 'light',
    })
    expect(result.success).toBe(true)
  })
})

describe('buildSnapshot / validateSnapshot / applySnapshot — v3 round-trip', () => {
  it('builds, validates, and applies a clean v3 envelope', () => {
    const task = createTask({ id: '1', title: 'Hello' })
    useTaskStore.setState({ tasks: [task] })
    useTimerStore.getState().setTimerSettings({ focusDuration: 45 })
    usePlannerStore.getState().setWeekStartDay(0)

    const json = JSON.stringify(buildSnapshot())
    const parsed = validateSnapshot(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.version).toBe(CURRENT_VERSION)
    expect((parsed.data.tasks as Task[]).map((t) => t.id)).toEqual(['1'])
    expect((parsed.data.timer as { focusDuration: number }).focusDuration).toBe(
      45,
    )
    expect((parsed.data.planner as { weekStartDay: number }).weekStartDay).toBe(
      0,
    )
    expect((parsed.data as Record<string, unknown>).theme).toBeUndefined()

    useTaskStore.setState({ tasks: [] })
    const result = applySnapshot(parsed.data)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings).toBeUndefined()
    expect(useTaskStore.getState().tasks[0]?.title).toBe('Hello')
  })

  it('round-trip does not include a theme field', () => {
    const json = JSON.stringify(buildSnapshot())
    const obj = JSON.parse(json) as Record<string, unknown>
    expect('theme' in obj).toBe(false)
  })
})

describe('validateSnapshot — v2 migration', () => {
  it('migrates a v2 envelope with settings into a v3 envelope', () => {
    const v2 = {
      version: 2,
      exportedAt: '2025-12-01T00:00:00.000Z',
      tasks: [createTask({ id: '1' })],
      groups: [
        {
          id: DEFAULT_GROUP_ID,
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: '2025-12-01T00:00:00.000Z',
        },
      ],
      settings: {
        timer: { ...DEFAULT_TIMER_SETTINGS, focusDuration: 35 },
        theme: 'dark',
        weekStartDay: 0,
      },
    }
    const result = validateSnapshot(JSON.stringify(v2))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.version).toBe(3)
    expect((result.data.timer as { focusDuration: number }).focusDuration).toBe(
      35,
    )
    expect((result.data.planner as { weekStartDay: number }).weekStartDay).toBe(
      0,
    )
    expect('theme' in result.data).toBe(false)
  })
})

describe('validateSnapshot — rejections', () => {
  it('rejects malformed JSON', () => {
    const result = validateSnapshot('not json')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/corrupted/i)
  })

  it('rejects a payload with no version', () => {
    const result = validateSnapshot(
      JSON.stringify({ tasks: [], groups: [], timer: {}, planner: {} }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('Not a DayBox export file.')
  })

  it('rejects a payload with the wrong version', () => {
    const result = validateSnapshot(
      JSON.stringify({
        version: 1,
        tasks: [],
        groups: [],
        timer: {},
        planner: {},
      }),
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a v3 envelope missing a required slice field', () => {
    const result = validateSnapshot(
      JSON.stringify({
        version: 3,
        exportedAt: '2026-06-07T00:00:00.000Z',
        tasks: [],
        groups: [],
        timer: DEFAULT_TIMER_SETTINGS,
      }),
    )
    expect(result.ok).toBe(false)
  })
})

describe('schema round-trips match the canonical feature schemas', () => {
  it('a task produced by the tasks slice passes TaskSchema', () => {
    const snapshot = buildSnapshot()
    const result = z.array(TaskSchema).safeParse(snapshot.tasks)
    expect(result.success).toBe(true)
  })

  it('a group produced by the groups slice passes GroupSchema', () => {
    const snapshot = buildSnapshot()
    const result = z.array(GroupSchema).safeParse(snapshot.groups)
    expect(result.success).toBe(true)
  })
})
