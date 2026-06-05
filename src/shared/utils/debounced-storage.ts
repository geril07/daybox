import type { StateStorage } from 'zustand/middleware'

export interface DebouncedStringStorage extends StateStorage {
  flush: () => void
}

export function createDebouncedStringStorage(
  base: StateStorage,
  delayMs: number,
): DebouncedStringStorage {
  let pending: { name: string; value: string } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const writePending = (): void => {
    if (pending) {
      base.setItem(pending.name, pending.value)
      pending = null
    }
  }

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    writePending()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    getItem: (name) => base.getItem(name),
    setItem: (name, value) => {
      pending = { name, value }
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        writePending()
      }, delayMs)
    },
    removeItem: (name) => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      pending = null
      base.removeItem(name)
    },
    flush,
  }
}
