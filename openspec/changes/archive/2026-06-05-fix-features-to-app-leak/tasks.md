## 1. Create `app/theme.ts`

- [x] 1.1 Create `src/app/theme.ts` exporting a `useTheme()` hook that returns the current theme, reads from `localStorage.getItem('daybox-theme')` on init (defaulting to `'light'`), and writes back on change
- [x] 1.2 Add a module-level side effect that synchronously applies `.dark` to `<html>` on import (so the class is set before React first paints)
- [x] 1.3 Add `setTheme(theme: 'light' | 'dark')` action to the hook

## 2. Create `features/planner/store.ts`

- [x] 2.1 Create `src/features/planner/store.ts` with `usePlannerStore` (Zustand + `persist` middleware, key `daybox-planner`)
- [x] 2.2 Add state: `weekStartDay: 0 | 1 | ... | 6` (default `1`), `browseDate: string | null` (default `null`)
- [x] 2.3 Add actions: `setWeekStartDay(day)`, `setBrowseDate(date)`, `stepBrowseDate(delta: 1 | -1)`
- [x] 2.4 Create `src/features/planner/store.test.ts` covering defaults, set, and step actions
- [x] 2.5 Re-export `usePlannerStore`, types, and actions from `src/features/planner/index.ts`

## 3. Merge `TimerSettings` into `features/timer/store.ts`

- [x] 3.1 Add `settings: TimerSettings` slice to `useTimerStore`'s state; default to `DEFAULT_TIMER_SETTINGS`
- [x] 3.2 Add action `setTimerSettings(partial: Partial<TimerSettings>)` that merges into the existing `settings` slice and persists
- [x] 3.3 Verify the existing `daybox-timer` `persist` key still serialises both runtime state and the new settings slice
- [x] 3.4 Add tests in `src/features/timer/store.test.ts` for the new `settings` slice and `setTimerSettings` action
- [x] 3.5 Remove the now-unused `TimerSettings` and `DEFAULT_TIMER_SETTINGS` exports from `src/shared/types.ts`

## 4. Update timer consumers to read from `useTimerStore`

- [x] 4.1 In `src/features/timer/components/TimerBar.tsx`, replace `useSettingsStore((s) => s.settings.timer)` with `useTimerStore((s) => s.settings)`
- [x] 4.2 In `src/features/timer/components/TimerSettingsPanel.tsx`, replace `useSettingsStore` reads with `useTimerStore((s) => s.settings)` and writes via `useTimerStore.getState().setTimerSettings(partial)`

## 5. Update planner consumers to read from `usePlannerStore`

- [x] 5.1 In `src/features/planner/components/WeekView.tsx`, replace `useSettingsStore((s) => s.settings.weekStartDay)` with `usePlannerStore((s) => s.weekStartDay)`
- [x] 5.2 In `src/features/planner/components/DateBrowser.tsx`, replace `useUIStore((s) => s.browseDate)` and `useUIStore((s) => s.setBrowseDate)` with `usePlannerStore((s) => s.browseDate)` and `usePlannerStore((s) => s.stepBrowseDate(...))`

## 6. Update `app/App.tsx`

- [x] 6.1 Replace the `useUIStore` `view`/`setView` reads with a local `useState<View>`
- [x] 6.2 Replace the `useSettingsStore` `theme` read with `useTheme()` from `app/theme.ts`
- [x] 6.3 Add a second guarded `useEffect` migration step that runs after the existing `daybox-app-store` migration and reads `daybox-settings`, splits it into `useTimerStore.getState().setTimerSettings(settings.timer)`, `usePlannerStore.getState().setWeekStartDay(settings.weekStartDay)`, and the theme hook's `setTheme(settings.theme)`, then removes `daybox-settings`
- [x] 6.4 Remove the `useSettingsStore` and `useUIStore` imports; remove the `useSettingsStore` and `useGroupStore` imports that the migration used (the v1 migration keeps them only for `useTaskStore`/`useGroupStore`)

## 7. Update `app/localStorage.ts`

- [x] 7.1 Change `exportData()` to read from `useTaskStore`, `useGroupStore`, `useTimerStore` (settings slice only, not runtime), `usePlannerStore`, and the theme value
- [x] 7.2 Add `version: 3` to the exported JSON shape
- [x] 7.3 Update `parseImport()` to accept `version: 2` (legacy single-settings shape) and `version: 3` (current five-key shape); v2 path writes to the per-feature stores
- [x] 7.4 Update `app/localStorage.test.ts` to cover the v3 shape and the v2 → v3 import path

## 8. Delete removed files and exports

- [x] 8.1 Delete `src/app/settingsStore.ts`
- [x] 8.2 Delete `src/app/settingsStore.test.ts`
- [x] 8.3 Delete `src/app/uiStore.ts`
- [x] 8.4 Remove the `AppSettings`, `TimerSettings`, `View`, `DEFAULT_APP_SETTINGS`, and `DEFAULT_TIMER_SETTINGS` exports from `src/shared/types.ts`
- [x] 8.5 Inline the `View` union type where it was imported (`app/App.tsx`, `app/localStorage.ts` if applicable, and any other consumers)

## 9. Verify

- [x] 9.1 Run `npm run typecheck`; resolve any remaining imports of `TimerSettings`, `View`, `AppSettings`, `DEFAULT_APP_SETTINGS`, or `DEFAULT_TIMER_SETTINGS` from `shared/types`
- [x] 9.2 Run `npm run lint`
- [x] 9.3 Run `npm run test`; confirm all tests pass (existing + new planner store tests + new timer settings tests)
- [x] 9.4 Run `npm run format`
- [x] 9.5 Manually verify in dev: with a fresh localStorage, all settings persist; with a `daybox-settings` blob, the v1-style values migrate to the right new keys on reload; with a v2 export file, import restores everything
