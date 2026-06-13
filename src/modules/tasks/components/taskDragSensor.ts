import { PointerActivationConstraints } from '@dnd-kit/dom'

export function taskRowActivationConstraints(event: PointerEvent) {
  if (event.pointerType === 'touch') {
    return [
      new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 }),
    ]
  }

  return undefined
}
