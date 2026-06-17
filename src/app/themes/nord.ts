import type { ThemePreset } from './types'

// All token values are exact official Nord colors (nordtheme.com),
// converted from hex to oklch. accentBg/overdueBg use the exact
// official accent/red at 0.15 alpha (no opaque tint exists in the palette).
export const nordPreset: ThemePreset = {
  id: 'nord',
  name: 'Nord',
  modes: {
    light: {
      bg: 'oklch(0.9513 0.0074 260.73)',
      bgCard: 'oklch(0.9330 0.0104 261.79)',
      bgHover: 'oklch(0.8993 0.0164 262.75)',
      fg: 'oklch(0.3244 0.0229 264.18)',
      fg2: 'oklch(0.4523 0.0352 264.13)',
      fg3: 'oklch(0.8993 0.0164 262.75)',
      border: 'oklch(0.8993 0.0164 262.75)',
      borderStrong: 'oklch(0.4523 0.0352 264.13)',
      accent: 'oklch(0.5944 0.0772 254.03)',
      accentBg: 'oklch(0.5944 0.0772 254.03 / 0.15)',
      breakColor: 'oklch(0.7683 0.0749 131.06)',
      lbreakColor: 'oklch(0.7746 0.0622 217.47)',
      overdue: 'oklch(0.6061 0.1206 15.34)',
      overdueBg: 'oklch(0.6061 0.1206 15.34 / 0.15)',
    },
    dark: {
      bg: 'oklch(0.3244 0.0229 264.18)',
      bgCard: 'oklch(0.3792 0.0290 266.47)',
      bgHover: 'oklch(0.4157 0.0324 264.13)',
      fg: 'oklch(0.9513 0.0074 260.73)',
      fg2: 'oklch(0.9330 0.0104 261.79)',
      fg3: 'oklch(0.8993 0.0164 262.75)',
      border: 'oklch(0.4523 0.0352 264.13)',
      borderStrong: 'oklch(0.8993 0.0164 262.75)',
      accent: 'oklch(0.5944 0.0772 254.03)',
      accentBg: 'oklch(0.5944 0.0772 254.03 / 0.15)',
      breakColor: 'oklch(0.7683 0.0749 131.06)',
      lbreakColor: 'oklch(0.7746 0.0622 217.47)',
      overdue: 'oklch(0.6061 0.1206 15.34)',
      overdueBg: 'oklch(0.6061 0.1206 15.34 / 0.15)',
    },
  },
}
