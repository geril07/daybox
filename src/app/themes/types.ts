export type ThemeMode = 'light' | 'dark'

export type ThemeModePreference = ThemeMode | 'system'

export type ThemePresetId = string

export interface ThemeSettings {
  mode: ThemeModePreference
  preset: ThemePresetId
}

export interface ThemeTokens {
  bg: string
  bgCard: string
  bgHover: string
  fg: string
  fg2: string
  fg3: string
  border: string
  borderStrong: string
  accent: string
  accentBg: string
  breakColor: string
  lbreakColor: string
  overdue: string
  overdueBg: string
}

export interface ThemePreset {
  id: ThemePresetId
  name: string
  modes: Partial<Record<ThemeMode, ThemeTokens>>
}
