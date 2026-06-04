import { create } from 'zustand'

import type { View } from '@/shared/types'

interface UIState {
  view: View
  browseDate: string | null
}

interface UIActions {
  setView: (view: View) => void
  setBrowseDate: (date: string | null) => void
}

export type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>()((set) => ({
  view: 'today',
  browseDate: null,

  setView: (view) => set({ view }),
  setBrowseDate: (date) => set({ browseDate: date }),
}))
