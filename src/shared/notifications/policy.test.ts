import { describe, expect, it } from 'vitest'

import { shouldFireIntervalEndNotification } from './policy'

describe('shouldFireIntervalEndNotification', () => {
  const permissions: NotificationPermission[] = ['default', 'denied', 'granted']

  it.each([
    { enabled: true, permission: 'granted' as const, expected: true },
    { enabled: false, permission: 'granted' as const, expected: false },
    { enabled: true, permission: 'default' as const, expected: false },
    { enabled: true, permission: 'denied' as const, expected: false },
  ])(
    'handles visible-tab opt-in with enabled=$enabled and permission=$permission',
    ({ enabled, permission, expected }) => {
      expect(
        shouldFireIntervalEndNotification({
          documentVisible: true,
          notifyWhileVisible: true,
          enabled,
          permission,
        }),
      ).toBe(expected)
    },
  )

  for (const documentVisible of [true, false]) {
    for (const permission of permissions) {
      for (const enabled of [true, false]) {
        it(`returns the notification policy for visible=${documentVisible}, permission=${permission}, enabled=${enabled}`, () => {
          expect(
            shouldFireIntervalEndNotification({
              documentVisible,
              permission,
              enabled,
              notifyWhileVisible: false,
            }),
          ).toBe(enabled && permission === 'granted' && !documentVisible)
        })
      }
    }
  }
})
