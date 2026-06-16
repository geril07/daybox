import { describe, it, expect, beforeEach } from 'vitest'

import { DEFAULT_GROUP_ID, useGroupStore } from '@/modules/groups'
import { useTaskStore } from '@/modules/tasks'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.550 0.150 0)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
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
    if (!task) throw new Error('addTask returned null')
    useGroupStore.getState().deleteGroup(group.id)
    useTaskStore
      .getState()
      .reassignTasks(group.id, useGroupStore.getState().getDefaultGroup()!.id)
    const storedTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === task.id)
    expect(storedTask?.groupId).toBe('default')
  })

  it('refuses to delete the default group when other groups exist', () => {
    useGroupStore.getState().addGroup('Work')
    useGroupStore.getState().addGroup('Home')
    expect(useGroupStore.getState().groups).toHaveLength(3)

    useGroupStore.getState().deleteGroup(DEFAULT_GROUP_ID)

    const groups = useGroupStore.getState().groups
    expect(groups).toHaveLength(3)
    expect(groups.some((g) => g.id === DEFAULT_GROUP_ID)).toBe(true)
  })

  it('does not throw when asked to delete the default group', () => {
    useGroupStore.getState().addGroup('Work')
    expect(() =>
      useGroupStore.getState().deleteGroup(DEFAULT_GROUP_ID),
    ).not.toThrow()
  })
})

describe('Group Store - setGroupColor', () => {
  it('changes a group color via setGroupColor', () => {
    const group = useGroupStore.getState().groups[0]
    expect(group.color).toBe('oklch(0.550 0.150 0)')

    useGroupStore.getState().setGroupColor(group.id, '#ff00ff')

    const updated = useGroupStore.getState().groups[0]
    expect(updated.color).toBe('#ff00ff')
  })

  it('does not mutate other groups when changing one color', () => {
    const work = useGroupStore.getState().addGroup('Work')
    const home = useGroupStore.getState().addGroup('Home')
    const originalHomeColor = home.color

    useGroupStore.getState().setGroupColor(work.id, '#abcdef')

    const groups = useGroupStore.getState().groups
    expect(groups.find((g) => g.id === home.id)?.color).toBe(originalHomeColor)
  })
})

describe('Group Store - getGroupColorIndex', () => {
  it('skips index 0 for first user-created group', () => {
    expect(useGroupStore.getState().groups).toHaveLength(1)
    const idx = useGroupStore.getState().getGroupColorIndex()
    expect(idx).toBe(1)
  })

  it('never returns 0 for any user-created group', () => {
    for (let i = 0; i < 15; i++) {
      useGroupStore.getState().addGroup(`Group ${i}`)
    }
    const idx = useGroupStore.getState().getGroupColorIndex()
    expect(idx).toBeGreaterThanOrEqual(1)
  })
})
