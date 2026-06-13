import { useGoogleDriveStore } from './store'

export function useIsConnected(): boolean {
  const expiresAt = useGoogleDriveStore((s) => s.expiresAt)
  const accessToken = useGoogleDriveStore((s) => s.accessToken)
  if (!accessToken || !expiresAt) return false
  return expiresAt > safeNow()
}

export function useAccountEmail(): string | undefined {
  return useGoogleDriveStore((s) => s.email)
}

export function useLastBackupAge(): string | null {
  const lastBackupAt = useGoogleDriveStore((s) => s.lastBackupAt)
  return useLastBackupAgeFrom(lastBackupAt)
}

function safeNow(): number {
  return Date.now()
}

function useLastBackupAgeFrom(lastBackupAt: string | undefined): string | null {
  if (!lastBackupAt) return null
  const then = new Date(lastBackupAt).getTime()
  if (Number.isNaN(then)) return null
  return formatAge(Date.now() - then)
}

function formatAge(diffMs: number): string {
  if (diffMs < 0) return 'just now'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
