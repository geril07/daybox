import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AppSettings, TimerSettings } from '@/shared/types'
import { DEFAULT_APP_SETTINGS } from '@/shared/types'

interface SettingsState {
  settings: AppSettings
}

interface SettingsActions {
  updateSettings: (updates: Partial<AppSettings>) => void
  updateTimerSettings: (updates: Partial<TimerSettings>) => void
}

export type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_APP_SETTINGS,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      updateTimerSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timer: { ...state.settings.timer, ...updates },
          },
        })),
    }),
    {
      name: 'daybox-settings',
    },
  ),
)
