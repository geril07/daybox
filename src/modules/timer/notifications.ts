import { sendNotification } from '@/shared/notifications'

let intervalNotification: Notification | undefined

export function clearIntervalNotification(): void {
  intervalNotification?.close()
  intervalNotification = undefined
}

export function notifyIntervalEnd(
  title: string,
  body: string | undefined,
  keepVisible: boolean,
): void {
  clearIntervalNotification()
  intervalNotification = sendNotification(
    title,
    body,
    () => {
      clearIntervalNotification()
      window.focus()
    },
    {
      requireInteraction: keepVisible,
      tag: 'daybox-interval-end',
    },
  )
}
