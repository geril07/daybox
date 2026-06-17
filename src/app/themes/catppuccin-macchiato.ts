import type { ThemePreset } from './types'

// All token values are exact official Catppuccin Macchiato colors
// (@catppuccin/palette v2). accentBg/overdueBg use the exact official
// mauve/red at 0.15 alpha (no opaque tint exists in the palette).
export const catppuccinMacchiatoPreset: ThemePreset = {
  id: 'catppuccin-macchiato',
  name: 'Catppuccin Macchiato',
  modes: {
    dark: {
      bg: 'oklch(0.2788 0.0353 276.94)',
      bgCard: 'oklch(0.2493 0.0305 278.44)',
      bgHover: 'oklch(0.3538 0.0369 275.99)',
      fg: 'oklch(0.8708 0.0481 273.67)',
      fg2: 'oklch(0.7513 0.0441 273.53)',
      fg3: 'oklch(0.5608 0.0407 276.47)',
      border: 'oklch(0.4259 0.0385 276.95)',
      borderStrong: 'oklch(0.5608 0.0407 276.47)',
      accent: 'oklch(0.7715 0.1259 303.90)',
      accentBg: 'oklch(0.7715 0.1259 303.90 / 0.15)',
      breakColor: 'oklch(0.8350 0.1079 138.15)',
      lbreakColor: 'oklch(0.8369 0.0719 209.37)',
      overdue: 'oklch(0.7370 0.1252 11.19)',
      overdueBg: 'oklch(0.7370 0.1252 11.19 / 0.15)',
    },
  },
}
