import { catppuccinFrappePreset } from './catppuccin-frappe'
import { catppuccinLattePreset } from './catppuccin-latte'
import { catppuccinMacchiatoPreset } from './catppuccin-macchiato'
import { catppuccinMochaPreset } from './catppuccin-mocha'
import { defaultPreset } from './default'
import { nordPreset } from './nord'
import { solarizedPreset } from './solarized'
import type { ThemePreset, ThemePresetId } from './types'

export const DEFAULT_PRESET_ID = 'default'

const presetList: readonly ThemePreset[] = [
  defaultPreset,
  nordPreset,
  solarizedPreset,
  catppuccinLattePreset,
  catppuccinFrappePreset,
  catppuccinMacchiatoPreset,
  catppuccinMochaPreset,
]

const presetMap = new Map<ThemePresetId, ThemePreset>(
  presetList.map((p) => [p.id, p]),
)

export function getPreset(id: ThemePresetId): ThemePreset | undefined {
  return presetMap.get(id)
}

export function getPresets(): readonly ThemePreset[] {
  return presetList
}
