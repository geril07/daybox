import type { ThemeTokens } from './types'

export const semanticCssVars: Record<keyof ThemeTokens, string> = {
  bg: '--bg',
  bgCard: '--bg-card',
  bgHover: '--bg-hover',
  fg: '--fg',
  fg2: '--fg-2',
  fg3: '--fg-3',
  border: '--border',
  borderStrong: '--border-strong',
  accent: '--accent',
  accentBg: '--accent-bg',
  breakColor: '--break-color',
  lbreakColor: '--lbreak-color',
  overdue: '--overdue',
  overdueBg: '--overdue-bg',
}

export function deriveShadcnTokens(t: ThemeTokens): Record<string, string> {
  return {
    '--background': t.bg,
    '--foreground': t.fg,
    '--card': t.bgCard,
    '--card-foreground': t.fg,
    '--popover': t.bgCard,
    '--popover-foreground': t.fg2,
    '--primary': t.accent,
    '--primary-foreground': 'oklch(1 0 0)',
    '--secondary': t.bgHover,
    '--secondary-foreground': t.fg,
    '--muted': t.bg,
    '--muted-foreground': t.fg3,
    '--accent-foreground': 'oklch(1 0 0)',
    '--destructive': t.overdue,
    '--destructive-foreground': 'oklch(1 0 0)',
    '--input': t.border,
    '--ring': t.accent,
  }
}
