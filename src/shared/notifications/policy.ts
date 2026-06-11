export function shouldFireIntervalEndNotification(input: {
  documentVisible: boolean
  permission: NotificationPermission
  enabled: boolean
}): boolean {
  return (
    input.enabled && input.permission === 'granted' && !input.documentVisible
  )
}
