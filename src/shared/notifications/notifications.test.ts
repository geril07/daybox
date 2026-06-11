import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendNotification } from './notifications'

type NotificationMock = typeof Notification & {
  permission: NotificationPermission
  instances: Array<
    Notification & { title: string; options?: NotificationOptions }
  >
}

const getNotificationMock = () => Notification as unknown as NotificationMock

describe('sendNotification', () => {
  const originalNotification = window.Notification

  beforeEach(() => {
    const mock = getNotificationMock()
    mock.permission = 'default'
    mock.instances = []
  })

  afterEach(() => {
    vi.stubGlobal('Notification', originalNotification)
  })

  it('no-ops when Notification is unsupported', () => {
    Reflect.deleteProperty(window, 'Notification')

    expect(() => sendNotification('Done')).not.toThrow()
  })

  it('no-ops when permission is not granted', () => {
    const mock = getNotificationMock()
    mock.permission = 'denied'

    sendNotification('Done')

    expect(mock.instances).toHaveLength(0)
  })

  it('fires when permission is granted', () => {
    const mock = getNotificationMock()
    mock.permission = 'granted'

    sendNotification('Focus complete!', 'Task: Draft')

    expect(mock.instances).toHaveLength(1)
    expect(mock.instances[0].title).toBe('Focus complete!')
    expect(mock.instances[0].options).toEqual({ body: 'Task: Draft' })
  })

  it('assigns onclick when provided', () => {
    const mock = getNotificationMock()
    const onClick = vi.fn()
    mock.permission = 'granted'

    sendNotification('Focus complete!', undefined, onClick)

    expect(mock.instances[0].onclick).toBe(onClick)
  })
})
