import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'daybox-theme'

function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

if (typeof document !== 'undefined') {
  applyTheme(readTheme())
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

let cachedTheme: Theme = readTheme()

function getSnapshot(): Theme {
  return cachedTheme
}

function getServerSnapshot(): Theme {
  return 'light'
}

export function setTheme(theme: Theme): void {
  if (cachedTheme === theme) return
  cachedTheme = theme
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, theme)
  }
  applyTheme(theme)
  notify()
}

export function getTheme(): Theme {
  return cachedTheme
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return [theme, setTheme]
}
