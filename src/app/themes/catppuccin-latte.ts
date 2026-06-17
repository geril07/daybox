import type { ThemePreset } from './types'

// All token values are exact official Catppuccin Latte colors
// (@catppuccin/palette v2). accentBg/overdueBg use the exact official
// mauve/red at 0.15 alpha (no opaque tint exists in the palette).
export const catppuccinLattePreset: ThemePreset = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  modes: {
    light: {
      bg: 'oklch(0.9578 0.0058 264.53)',
      bgCard: 'oklch(0.9335 0.0087 264.52)',
      bgHover: 'oklch(0.8575 0.0145 268.48)',
      fg: 'oklch(0.4355 0.0430 279.33)',
      fg2: 'oklch(0.5471 0.0343 279.08)',
      fg3: 'oklch(0.7077 0.0237 274.60)',
      border: 'oklch(0.8083 0.0174 271.20)',
      borderStrong: 'oklch(0.7077 0.0237 274.60)',
      accent: 'oklch(0.5547 0.2503 297.02)',
      accentBg: 'oklch(0.5547 0.2503 297.02 / 0.15)',
      breakColor: 'oklch(0.6250 0.1772 140.44)',
      lbreakColor: 'oklch(0.6820 0.1448 235.38)',
      overdue: 'oklch(0.5505 0.2155 19.81)',
      overdueBg: 'oklch(0.5505 0.2155 19.81 / 0.15)',
    },
  },
}
