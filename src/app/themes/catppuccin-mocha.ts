import type { ThemePreset } from './types'

// All token values are exact official Catppuccin Mocha colors
// (@catppuccin/palette v2). accentBg/overdueBg use the exact official
// mauve/red at 0.15 alpha (no opaque tint exists in the palette).
export const catppuccinMochaPreset: ThemePreset = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  modes: {
    dark: {
      bg: 'oklch(0.2429 0.0304 283.91)',
      bgCard: 'oklch(0.2155 0.0254 284.06)',
      bgHover: 'oklch(0.3240 0.0319 281.98)',
      fg: 'oklch(0.8787 0.0426 272.28)',
      fg2: 'oklch(0.7510 0.0396 273.93)',
      fg3: 'oklch(0.5497 0.0345 277.10)',
      border: 'oklch(0.4037 0.0320 280.15)',
      borderStrong: 'oklch(0.5497 0.0345 277.10)',
      accent: 'oklch(0.7871 0.1187 304.77)',
      accentBg: 'oklch(0.7871 0.1187 304.77 / 0.15)',
      breakColor: 'oklch(0.8577 0.1092 142.72)',
      lbreakColor: 'oklch(0.8467 0.0833 210.25)',
      overdue: 'oklch(0.7556 0.1297 2.76)',
      overdueBg: 'oklch(0.7556 0.1297 2.76 / 0.15)',
    },
  },
}
