import type { ThemePreset } from './types'

// All token values are exact official Catppuccin Frappé colors
// (@catppuccin/palette v2). accentBg/overdueBg use the exact official
// mauve/red at 0.15 alpha (no opaque tint exists in the palette).
export const catppuccinFrappePreset: ThemePreset = {
  id: 'catppuccin-frappe',
  name: 'Catppuccin Frappé',
  modes: {
    dark: {
      bg: 'oklch(0.3291 0.0324 274.76)',
      bgCard: 'oklch(0.2973 0.0294 276.21)',
      bgHover: 'oklch(0.3949 0.0342 275.90)',
      fg: 'oklch(0.8619 0.0526 273.35)',
      fg2: 'oklch(0.7524 0.0483 274.47)',
      fg3: 'oklch(0.5809 0.0421 275.20)',
      border: 'oklch(0.4601 0.0367 272.97)',
      borderStrong: 'oklch(0.5809 0.0421 275.20)',
      accent: 'oklch(0.7648 0.1108 311.74)',
      accentBg: 'oklch(0.7648 0.1108 311.74 / 0.15)',
      breakColor: 'oklch(0.8124 0.1071 133.39)',
      lbreakColor: 'oklch(0.8255 0.0592 209.76)',
      overdue: 'oklch(0.7171 0.1244 19.39)',
      overdueBg: 'oklch(0.7171 0.1244 19.39 / 0.15)',
    },
  },
}
