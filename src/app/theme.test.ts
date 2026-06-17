import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deriveShadcnTokens, semanticCssVars } from '@/app/themes'
import type { ThemeTokens } from '@/app/themes'

function createTokens(overrides?: Partial<ThemeTokens>): ThemeTokens {
  return {
    bg: '#ffffff',
    bgCard: '#f0f0f0',
    bgHover: '#e0e0e0',
    fg: '#111111',
    fg2: '#444444',
    fg3: '#777777',
    border: '#cccccc',
    borderStrong: '#999999',
    accent: '#ff0000',
    accentBg: '#ffeeee',
    breakColor: '#00ff00',
    lbreakColor: '#0000ff',
    overdue: '#880000',
    overdueBg: '#ffeeee',
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('deriveShadcnTokens', () => {
  it('maps semantic tokens to shadcn CSS variable names', () => {
    const tokens = createTokens()
    const result = deriveShadcnTokens(tokens)

    expect(result['--background']).toBe(tokens.bg)
    expect(result['--foreground']).toBe(tokens.fg)
    expect(result['--card']).toBe(tokens.bgCard)
    expect(result['--card-foreground']).toBe(tokens.fg)
    expect(result['--popover']).toBe(tokens.bgCard)
    expect(result['--popover-foreground']).toBe(tokens.fg2)
    expect(result['--primary']).toBe(tokens.accent)
    expect(result['--secondary']).toBe(tokens.bgHover)
    expect(result['--secondary-foreground']).toBe(tokens.fg)
    expect(result['--muted']).toBe(tokens.bg)
    expect(result['--muted-foreground']).toBe(tokens.fg3)
    expect(result['--destructive']).toBe(tokens.overdue)
    expect(result['--input']).toBe(tokens.border)
    expect(result['--ring']).toBe(tokens.accent)
  })

  it('has hardcoded foreground tokens', () => {
    const tokens = createTokens()
    const result = deriveShadcnTokens(tokens)

    expect(result['--primary-foreground']).toBe('oklch(1 0 0)')
    expect(result['--accent-foreground']).toBe('oklch(1 0 0)')
    expect(result['--destructive-foreground']).toBe('oklch(1 0 0)')
  })

  it('includes all expected token names', () => {
    const tokens = createTokens()
    const result = deriveShadcnTokens(tokens)

    const expectedNames = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--input',
      '--ring',
    ]

    for (const name of expectedNames) {
      expect(result).toHaveProperty(name)
    }
    expect(Object.keys(result)).toHaveLength(expectedNames.length)
  })
})

describe('semanticCssVars', () => {
  it('maps all ThemeTokens keys to kebab-case -- CSS variable names', () => {
    expect(semanticCssVars.bg).toBe('--bg')
    expect(semanticCssVars.bgCard).toBe('--bg-card')
    expect(semanticCssVars.bgHover).toBe('--bg-hover')
    expect(semanticCssVars.fg).toBe('--fg')
    expect(semanticCssVars.fg2).toBe('--fg-2')
    expect(semanticCssVars.fg3).toBe('--fg-3')
    expect(semanticCssVars.border).toBe('--border')
    expect(semanticCssVars.borderStrong).toBe('--border-strong')
    expect(semanticCssVars.accent).toBe('--accent')
    expect(semanticCssVars.accentBg).toBe('--accent-bg')
    expect(semanticCssVars.breakColor).toBe('--break-color')
    expect(semanticCssVars.lbreakColor).toBe('--lbreak-color')
    expect(semanticCssVars.overdue).toBe('--overdue')
    expect(semanticCssVars.overdueBg).toBe('--overdue-bg')
  })

  it('has exactly 14 entries matching ThemeTokens', () => {
    const keys = Object.keys(semanticCssVars)
    expect(keys).toHaveLength(14)
  })
})

describe('theme migration and settings', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('migrates old "dark" string format to new object format', async () => {
    const store: Record<string, string | null> = {
      'daybox-theme': 'dark',
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: vi.fn() },
        style: { setProperty: vi.fn() },
      },
    })

    const { getTheme } = await import('@/app/theme')

    expect(getTheme().mode).toBe('dark')
    expect(getTheme().preset).toBe('default')
    expect(store['daybox-theme']).toBe(
      JSON.stringify({ mode: 'dark', preset: 'default' }),
    )
  })

  it('migrates old "light" string format', async () => {
    const store: Record<string, string | null> = {
      'daybox-theme': 'light',
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: vi.fn() },
        style: { setProperty: vi.fn() },
      },
    })

    const { getTheme } = await import('@/app/theme')

    expect(getTheme().mode).toBe('light')
    expect(getTheme().preset).toBe('default')
  })

  it('uses new object format as-is without migration', async () => {
    const stored = JSON.stringify({ mode: 'dark', preset: 'nord' })
    const store: Record<string, string | null> = {
      'daybox-theme': stored,
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: vi.fn() },
        style: { setProperty: vi.fn() },
      },
    })

    const { getTheme } = await import('@/app/theme')

    expect(getTheme().mode).toBe('dark')
    expect(getTheme().preset).toBe('nord')
  })

  it('defaults to system/default when no key exists', async () => {
    const store: Record<string, string | null> = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: vi.fn() },
        style: { setProperty: vi.fn() },
      },
    })
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })

    const { getTheme } = await import('@/app/theme')

    expect(getTheme().mode).toBe('system')
    expect(getTheme().preset).toBe('default')
  })

  it('defaults to system/default on invalid JSON', async () => {
    const store: Record<string, string | null> = {
      'daybox-theme': 'not-valid-json{{{',
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: vi.fn() },
        style: { setProperty: vi.fn() },
      },
    })
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })

    const { getTheme } = await import('@/app/theme')

    expect(getTheme().mode).toBe('system')
    expect(getTheme().preset).toBe('default')
  })
})
