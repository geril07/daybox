export function shouldFireIntervalEndNotification(input: {
  documentVisible: boolean
  permission: NotificationPermission
  enabled: boolean
  notifyWhileVisible: boolean
}): boolean {
  return (
    input.enabled &&
    input.permission === 'granted' &&
    (!input.documentVisible || input.notifyWhileVisible)
  )
}
