import { describe, expect, it } from 'vitest'

import { taskRowActivationConstraints } from './taskDragSensor'

describe('taskRowActivationConstraints', () => {
  it('delays touch activation', () => {
    const constraints = taskRowActivationConstraints({
      pointerType: 'touch',
    } as PointerEvent)

    expect(Array.isArray(constraints)).toBe(true)
    expect(constraints).toHaveLength(1)
  })

  it('keeps mouse activation immediate', () => {
    expect(
      taskRowActivationConstraints({ pointerType: 'mouse' } as PointerEvent),
    ).toBeUndefined()
  })
})
