import { HistoryStateSchema } from '../schema'
import type { HistoryEvent } from '../types'
import { putStoredHistory } from './repository'

export const LEGACY_HISTORY_KEY = 'daybox-history'

interface LegacyHistory {
  events: HistoryEvent[]
  trackingStartedAt: string
  trackingUtcOffsetMinutes: number
}

function parseLegacyBlob(raw: string): LegacyHistory | null {
  try {
    const envelope = JSON.parse(raw) as { state?: unknown }
    // The blob was written by zustand persist, so the payload sits in `state`.
    const parsed = HistoryStateSchema.safeParse(
      (envelope as { state?: unknown })?.state,
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Copies a pre-IndexedDB `daybox-history` blob into the database and removes
 * the key only after the write lands. Puts are upserts, so an interrupted
 * migration completes on the next load without duplicating events.
 */
export async function migrateLegacyHistory() {
  const raw = localStorage.getItem(LEGACY_HISTORY_KEY)
  if (raw === null) return

  const legacy = parseLegacyBlob(raw)
  if (legacy === null) {
    // The pre-migration app reset an invalid blob on its next write anyway.
    localStorage.removeItem(LEGACY_HISTORY_KEY)
    console.warn('[daybox] Dropped invalid legacy activity history blob')
    return
  }

  await putStoredHistory(legacy.events, {
    trackingStartedAt: legacy.trackingStartedAt,
    trackingUtcOffsetMinutes: legacy.trackingUtcOffsetMinutes,
  })
  localStorage.removeItem(LEGACY_HISTORY_KEY)
}
