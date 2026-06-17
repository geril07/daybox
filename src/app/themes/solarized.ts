import type { ThemePreset } from './types'

// All token values are exact official Solarized colors
// (ethanschoonover.com/solarized), converted from hex to oklch.
// accentBg/overdueBg use the exact official blue/red at 0.15 alpha
// (no opaque tint exists in the palette).
export const solarizedPreset: ThemePreset = {
  id: 'solarized',
  name: 'Solarized',
  modes: {
    light: {
      bg: 'oklch(0.9735 0.0261 90.10)',
      bgCard: 'oklch(0.9306 0.0260 92.40)',
      bgHover: 'oklch(0.9306 0.0260 92.40)',
      fg: 'oklch(0.5682 0.0285 221.90)',
      fg2: 'oklch(0.6537 0.0197 205.26)',
      fg3: 'oklch(0.6979 0.0159 196.79)',
      border: 'oklch(0.9306 0.0260 92.40)',
      borderStrong: 'oklch(0.6979 0.0159 196.79)',
      accent: 'oklch(0.6149 0.1394 244.93)',
      accentBg: 'oklch(0.6149 0.1394 244.93 / 0.15)',
      breakColor: 'oklch(0.6444 0.1508 118.60)',
      lbreakColor: 'oklch(0.6437 0.1019 187.38)',
      overdue: 'oklch(0.5863 0.2064 27.12)',
      overdueBg: 'oklch(0.5863 0.2064 27.12 / 0.15)',
    },
    dark: {
      bg: 'oklch(0.2673 0.0486 219.82)',
      bgCard: 'oklch(0.3092 0.0518 219.65)',
      bgHover: 'oklch(0.3092 0.0518 219.65)',
      fg: 'oklch(0.6537 0.0197 205.26)',
      fg2: 'oklch(0.5682 0.0285 221.90)',
      fg3: 'oklch(0.5230 0.0283 219.14)',
      border: 'oklch(0.3092 0.0518 219.65)',
      borderStrong: 'oklch(0.5230 0.0283 219.14)',
      accent: 'oklch(0.6149 0.1394 244.93)',
      accentBg: 'oklch(0.6149 0.1394 244.93 / 0.15)',
      breakColor: 'oklch(0.6444 0.1508 118.60)',
      lbreakColor: 'oklch(0.6437 0.1019 187.38)',
      overdue: 'oklch(0.5863 0.2064 27.12)',
      overdueBg: 'oklch(0.5863 0.2064 27.12 / 0.15)',
    },
  },
}
