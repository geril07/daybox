export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendNotification(
  title: string,
  body?: string,
  onClick?: () => void,
  options?: NotificationOptions,
): Notification | undefined {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const notification = new Notification(title, { ...options, body })
  if (onClick) notification.onclick = onClick
  return notification
}
