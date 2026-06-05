## Why

Four files in `features/` import from `app/settingsStore` or `app/uiStore`, breaking the architectural rule that data flows `app → features → shared` and that features never reach upward into the app layer. The god-store `app/settingsStore.ts` owns three concerns owned by three different features (timer configuration, week-start preference, theme), and `app/uiStore.ts` owns one app concern (`view`) plus one planner concern (`browseDate`). Fixing the leak by splitting stores by feature ownership keeps the layering rule honest and aligns with the existing per-domain store pattern (`daybox-tasks`, `daybox-groups`, `daybox-timer`).

## What Changes

- **Split `app/settingsStore.ts` by feature ownership**:
  - `TimerSettings` (durations, auto-start, alarm) merges into `features/timer/store.ts` under the existing `daybox-timer` localStorage key
  - `weekStartDay` moves into a new `features/planner/store.ts` under a new `daybox-planner` localStorage key
  - `theme` becomes a tiny `app/theme.ts` hook backed by its own `daybox-theme` localStorage key (only `app/App.tsx` consumes it; no feature depends on theme)
- **Split `app/uiStore.ts` by ownership**:
  - `view` (current planner tab) is inlined as `useState` in `app/App.tsx` — the only reader — and is not persisted
  - `browseDate` (date-browser state) moves into the new `features/planner/store.ts` under `daybox-planner`
- **Delete `app/settingsStore.ts` and `app/uiStore.ts`** — replaced by the three new homes above
- **One-shot migration**: on boot, if `daybox-settings` exists, split it into `daybox-timer` (timer), `daybox-planner` (weekStartDay), and `daybox-theme`, then delete `daybox-settings`
- **Update consumers**:
  - `features/timer/components/TimerBar.tsx` and `features/timer/components/TimerSettingsPanel.tsx` read `TimerSettings` from `features/timer/store.ts` instead of `app/settingsStore.ts`
  - `features/planner/components/WeekView.tsx` reads `weekStartDay` from `features/planner/store.ts`
  - `features/planner/components/DateBrowser.tsx` reads/writes `browseDate` from `features/planner/store.ts`
  - `app/App.tsx` reads `theme` from `app/theme.ts`, uses a local `useState` for `view`, and registers the `daybox-settings` migration
- **Delete `features/timer/components/TimerSettingsPanel.tsx`'s dependency on `app/settingsStore.ts`** — same source as TimerBar
- **No behavior changes** — the UI, persisted semantics from the user's perspective, and store APIs observed by consumers remain identical; only the _location_ of state and the localStorage key layout change

## Capabilities

### New Capabilities

- `planner-preferences`: The planner feature owns its own preferences — the first day of the week (used by the Week view) and the currently-browsed date (used by the Date Browser). Both are persisted in the planner's own store. The header view selector is **not** part of this capability — it lives in the app shell and is not persisted.

### Modified Capabilities

- `data-persistence`: Add the new localStorage key layout (`daybox-tasks`, `daybox-groups`, `daybox-timer` now also holds timer configuration, `daybox-planner` holds planner preferences, `daybox-theme` holds the theme). Update the export/import requirements to round-trip all five keys. Add a new migration scenario for the `daybox-settings` → split-keys path, alongside the existing `daybox-app-store` migration.
- `pomodoro-timer`: Add a requirement that timer configuration (durations, auto-start, alarm sound/volume/repeat, long-break interval) is persisted in the timer's own store under `daybox-timer` rather than a separate settings store. The `TimerSettingsPanel` reads and writes the timer's own store.
- `time-views`: Add a requirement that the first day of the week and the date browser's current date are persisted in the planner feature's own store under `daybox-planner`. The `WeekView` reads the week-start preference from the planner store; the `DateBrowser` reads and writes the browse-date from the same store.
- `settings`: Reduce the `settings` capability to the app-shell concerns: the settings drawer opens/closes from the header, and the drawer hosts feature-owned panels (Timer, Groups, Theme, First day of week). The actual persisted data for each panel lives in the corresponding feature's own store. Remove the requirements that describe the _storage location_ of timer/theme/week-start data — those are now described by the owning capability.

## Impact

- **Deleted files**: `src/app/settingsStore.ts`, `src/app/uiStore.ts`
- **Deleted tests**: `src/app/settingsStore.test.ts` (timer settings test moves into `features/timer/store.test.ts`)
- **New files**:
  - `src/app/theme.ts` — `useTheme()` hook + `<html class="dark">` mirror
  - `src/features/planner/store.ts` — planner preferences (weekStartDay, browseDate) with `daybox-planner` persistence
  - `src/features/planner/store.test.ts` — weekStartDay and browseDate tests
  - `openspec/changes/fix-features-to-app-leak/specs/<capability>/spec.md` (see Capabilities above)
- **Modified files**:
  - `src/app/App.tsx` — inlines `view` as `useState`; reads `theme` from `app/theme.ts`; adds the `daybox-settings` migration step; removes the `useSettingsStore` and `useUIStore` imports
  - `src/app/localStorage.ts` — export/import round-trips five keys (`tasks`, `groups`, `timer`, `planner`, `theme`) instead of three; settings aggregation removed
  - `src/app/localStorage.test.ts` — covers the five-key shape
  - `src/features/timer/store.ts` — adds a `settings: TimerSettings` slice; adds `setTimerSettings(partial)` action; persists under existing `daybox-timer` key
  - `src/features/timer/store.test.ts` — covers the new settings slice
  - `src/features/timer/components/TimerBar.tsx` — reads `settings` from `useTimerStore`
  - `src/features/timer/components/TimerSettingsPanel.tsx` — reads/writes via `useTimerStore` actions
  - `src/features/planner/components/WeekView.tsx` — reads `weekStartDay` from `usePlannerStore`
  - `src/features/planner/components/DateBrowser.tsx` — reads/writes `browseDate` from `usePlannerStore`
  - `src/shared/types.ts` — remove `AppSettings`, `TimerSettings`, `DEFAULT_APP_SETTINGS`, `DEFAULT_TIMER_SETTINGS`, `View` (moved to their owning features/app). `TimerPhase` stays for now (used only by timer, will move to `features/timer/types.ts` in the follow-up `shared-cleanup` change).
- **No new dependencies** introduced.
- **No behavior changes** observable to the user: same UI, same store APIs at the call sites (consumers re-read from the new home), same data semantics.
- **One-time localStorage migration** for users on the current `daybox-settings` layout.
