import { useSyncExternalStore } from 'react'
import { z } from 'zod'

import {
  type ThemeModePreference,
  type ThemeMode,
  type ThemeSettings,
  type ThemeTokens,
  DEFAULT_PRESET_ID,
  defaultPreset,
  getPreset,
  getPresets,
  semanticCssVars,
  deriveShadcnTokens,
} from './themes'

export const ThemeSettingsSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  preset: z.string(),
})

const STORAGE_KEY = 'daybox-theme'

function defaultPresetTokens(): ThemeTokens {
  return defaultPreset.modes.dark ?? ({} as ThemeTokens)
}

function readThemeSettings(): ThemeSettings {
  if (typeof localStorage === 'undefined') {
    return { mode: 'system', preset: DEFAULT_PRESET_ID }
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return { mode: 'system', preset: DEFAULT_PRESET_ID }
  }

  if (raw === 'dark' || raw === 'light') {
    const settings: ThemeSettings = { mode: raw, preset: DEFAULT_PRESET_ID }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
  }

  try {
    const parsed = ThemeSettingsSchema.safeParse(JSON.parse(raw))
    if (parsed.success) {
      return parsed.data
    }
  } catch {
    // fall through to default
  }

  return { mode: 'system', preset: DEFAULT_PRESET_ID }
}

function availableModesForPreset(presetId: string): ThemeModePreference[] {
  const preset = getPreset(presetId)
  if (!preset) return ['light', 'dark', 'system']
  const modes: ThemeModePreference[] = []
  if (preset.modes.light) modes.push('light')
  if (preset.modes.dark) modes.push('dark')
  if (modes.length === 2) modes.push('system')
  return modes
}

function normalizeSettings(settings: ThemeSettings): ThemeSettings {
  const { preset } = settings
  let { mode } = settings

  const resolvedPreset = getPreset(preset) ?? getPreset(DEFAULT_PRESET_ID)
  if (!resolvedPreset) {
    return { mode: 'system', preset: DEFAULT_PRESET_ID }
  }

  const allowed = availableModesForPreset(resolvedPreset.id)

  if (!allowed.includes(mode)) {
    const manual = allowed.find((m): m is ThemeMode => m !== 'system')
    mode = manual ?? 'dark'
  }

  return { mode, preset: resolvedPreset.id }
}

function resolveMode(mode: ThemeModePreference): ThemeMode {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return mode
}

function resolveTheme(settings: ThemeSettings): {
  settings: ThemeSettings
  effectiveMode: ThemeMode
  tokens: ThemeTokens
} {
  const normalized = normalizeSettings(settings)
  const effectiveMode = resolveMode(normalized.mode)
  const preset = getPreset(normalized.preset)
  const tokens =
    preset?.modes[effectiveMode] ??
    getPreset(DEFAULT_PRESET_ID)?.modes[effectiveMode] ??
    defaultPresetTokens()

  return { settings: normalized, effectiveMode, tokens }
}

function applyTheme(tokens: ThemeTokens, effectiveMode: ThemeMode): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement

  for (const [key, cssVar] of Object.entries(semanticCssVars)) {
    el.style.setProperty(cssVar, tokens[key as keyof ThemeTokens])
  }

  const shadcn = deriveShadcnTokens(tokens)
  for (const [name, value] of Object.entries(shadcn)) {
    el.style.setProperty(name, value)
  }

  el.classList.toggle('dark', effectiveMode === 'dark')
}

let cachedSettings: ThemeSettings = readThemeSettings()
let cachedResolved = resolveTheme(cachedSettings)

if (typeof document !== 'undefined') {
  applyTheme(cachedResolved.tokens, cachedResolved.effectiveMode)
}

let matchMediaListener: (() => void) | null = null

function manageSystemListener(mode: ThemeModePreference): void {
  if (typeof window === 'undefined') return

  if (matchMediaListener) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.removeEventListener('change', matchMediaListener)
    matchMediaListener = null
  }

  if (mode === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = resolveTheme(cachedSettings)
      applyTheme(resolved.tokens, resolved.effectiveMode)
      cachedResolved = resolved
      notify()
    }
    mq.addEventListener('change', handler)
    matchMediaListener = handler
  }
}

manageSystemListener(cachedSettings.mode)

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

function getSnapshot() {
  return cachedResolved
}

function getServerSnapshot() {
  return {
    settings: { mode: 'system' as const, preset: DEFAULT_PRESET_ID },
    effectiveMode: 'light' as const,
    tokens: getPreset(DEFAULT_PRESET_ID)?.modes.light ?? ({} as ThemeTokens),
  }
}

function enableViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

export function setThemeWithViewTransition(
  patch: Partial<ThemeSettings>,
  event: { clientX: number; clientY: number },
): void {
  const { settings } = cachedResolved
  const nextSettings: ThemeSettings = { ...settings, ...patch }

  if (!enableViewTransitions()) {
    setTheme(nextSettings)
    return
  }

  const { clientX: x, clientY: y } = event
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const clipPathFrom = `circle(0px at ${x}px ${y}px)`
  const clipPathTo = `circle(${endRadius}px at ${x}px ${y}px)`

  const resolved = resolveTheme(nextSettings)

  const transition = document.startViewTransition(() => {
    cachedSettings = resolved.settings
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings))
    }
    applyTheme(resolved.tokens, resolved.effectiveMode)
    manageSystemListener(cachedSettings.mode)
    cachedResolved = resolved
    notify()
  })

  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [clipPathFrom, clipPathTo] },
      {
        duration: 300,
        easing: 'ease-in',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}

export function setTheme(settings: ThemeSettings): void {
  const resolved = resolveTheme(settings)
  if (
    cachedSettings.mode === resolved.settings.mode &&
    cachedSettings.preset === resolved.settings.preset
  ) {
    return
  }
  cachedSettings = resolved.settings
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings))
  }
  applyTheme(resolved.tokens, resolved.effectiveMode)
  manageSystemListener(cachedSettings.mode)
  cachedResolved = resolved
  notify()
}

export function getTheme(): ThemeSettings {
  return cachedSettings
}

export function useTheme() {
  const { settings, effectiveMode, tokens } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const allPresets = getPresets()
  const availableModes = availableModesForPreset(settings.preset)

  return {
    settings,
    effectiveMode,
    tokens,
    presets: allPresets,
    availableModes,
    setMode(mode: ThemeModePreference) {
      setTheme({ ...settings, mode })
    },
    setPreset(preset: string) {
      setTheme({ ...settings, preset })
    },
    setTheme,
  }
}
