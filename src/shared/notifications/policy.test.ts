import { describe, expect, it } from 'vitest'

import { shouldFireIntervalEndNotification } from './policy'

describe('shouldFireIntervalEndNotification', () => {
  const permissions: NotificationPermission[] = ['default', 'denied', 'granted']

  for (const documentVisible of [true, false]) {
    for (const permission of permissions) {
      for (const enabled of [true, false]) {
        it(`returns the notification policy for visible=${documentVisible}, permission=${permission}, enabled=${enabled}`, () => {
          expect(
            shouldFireIntervalEndNotification({
              documentVisible,
              permission,
              enabled,
            }),
          ).toBe(enabled && permission === 'granted' && !documentVisible)
        })
      }
    }
  }
})
