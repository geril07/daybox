type ShortcutMap = Record<string, () => void>

const activeShortcuts: ShortcutMap = {}

export function registerShortcuts(shortcuts: ShortcutMap): () => void {
  for (const [key, handler] of Object.entries(shortcuts)) {
    activeShortcuts[key] = handler
  }

  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    const key = e.key.toLowerCase()
    const shortcut = activeShortcuts[key]
    if (shortcut) {
      e.preventDefault()
      shortcut()
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
