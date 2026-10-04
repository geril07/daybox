import { z } from 'zod'

const VersionSchema = z.object({ buildId: z.string().min(1) })
const CHECK_INTERVAL_MS = 5 * 60_000
const CHECK_COOLDOWN_MS = 60_000
const REQUEST_TIMEOUT_MS = 15_000

export function watchForAppUpdate(
  currentBuildId: string,
  onVersion: (availableBuildId: string | null) => void,
): () => void {
  let stopped = false
  let lastCheckedAt = -Infinity
  let request: AbortController | undefined

  const check = async () => {
    if (
      stopped ||
      document.visibilityState !== 'visible' ||
      request ||
      Date.now() - lastCheckedAt < CHECK_COOLDOWN_MS
    )
      return

    lastCheckedAt = Date.now()
    const controller = new AbortController()
    request = controller
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    )
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) return
      const version = VersionSchema.safeParse(await response.json())
      if (stopped || controller.signal.aborted || !version.success) return
      onVersion(
        version.data.buildId === currentBuildId ? null : version.data.buildId,
      )
    } catch {
      // Offline or a deployment in progress: try again on the next check.
    } finally {
      window.clearTimeout(timeout)
      request = undefined
    }
  }

  void check()
  const interval = window.setInterval(check, CHECK_INTERVAL_MS)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('focus', check)
  window.addEventListener('online', check)

  return () => {
    stopped = true
    request?.abort()
    window.clearInterval(interval)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('focus', check)
    window.removeEventListener('online', check)
  }
}
