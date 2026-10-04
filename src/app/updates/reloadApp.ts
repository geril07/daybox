import { timerStorage } from '@/modules/timer'

export function reloadApp(): void {
  timerStorage.flush()
  window.location.reload()
}
