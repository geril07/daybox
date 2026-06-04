import { describe, it, expect, beforeEach } from 'vitest'

import { useTaskStore } from '@/features/tasks/store'

beforeEach(() => {
  useTaskStore.setState({ tasks: [] })
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
