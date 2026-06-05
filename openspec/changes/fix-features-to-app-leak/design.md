## Context

Today, `app/settingsStore.ts` is a Zustand store with `persist` middleware that owns three concerns owned by three different features:

- `timer` — `TimerSettings` (focus/short/long durations, long-break interval, auto-start flags, alarm sound/volume/repeat)
- `planner` — `weekStartDay` (used by `WeekView`)
- `app` — `theme` (used by `App.tsx` to toggle `.dark` on `<html>`)

Likewise, `app/uiStore.ts` mixes:

- `app` — `view` (current planner tab; consumed only by `App.tsx`)
- `planner` — `browseDate` (consumed by `DateBrowser`)

This forces four files in `features/` to import from `app/`, breaking the layering rule. The existing per-domain store pattern (`daybox-tasks`, `daybox-groups`, `daybox-timer`) suggests the right shape: each persisted state lives with the feature that owns it. The architectural change realigns these two stores with that pattern.

`App.tsx` already runs a one-shot migration from the legacy `daybox-app-store` key on first load. The new layout adds a second migration step from `daybox-settings` to the split keys.

## Goals / Non-Goals

**Goals:**

- Eliminate every `features → app` import path for state. After this change, the only `features → app` edges allowed are to `app/localStorage` (for export/import glue in `SettingsDrawer`) and to `app/theme` (theme is a shell concern, not data).
- Each persisted feature-owned data slice lives in the feature's own Zustand store, keyed under the feature's own localStorage key.
- `app/` becomes pure wiring + shell — no Zustand stores, no domain data.
- Existing data on the `daybox-settings` key is migrated forward with zero user-visible loss.
- All existing tests continue to pass; new tests cover the new slices.

**Non-Goals:**

- No UI changes. No spec-visible behavior changes beyond the storage layout.
- The cross-feature cascade in `GroupSettingsPanel` (which mutates `useTaskStore` on group delete) is **deferred** to a future change. It is a small, user-initiated interaction and the architectural fix is the priority.
- Domain types are not yet moved out of `shared/types.ts` (`Task`, `Group`, `TimerPhase`, `View`, `GROUP_COLORS`). The `View` type is the only one that goes away in this change (inlining it as a literal union in `App.tsx` and `DateBrowser`/`WeekView` parameter types where needed). The rest move in the follow-up `shared-cleanup` change.
- No new dependencies. No new lint rules.
- No changes to the test setup file location (also deferred to `shared-cleanup`).

## Decisions

### 1. Merge `TimerSettings` into the existing `features/timer/store.ts`

The timer feature already has a persisted store under `daybox-timer` that holds runtime state (`phase`, `startedAt`, `elapsed`, `sessionPomoCount`, `isRunning`, `focusedTaskId`). Adding a `settings: TimerSettings` slice to that same store keeps everything timer-related in one place, one persist middleware call, one localStorage read at boot.

**Alternatives considered:**

- *New `features/timer/settingsStore.ts` with `daybox-timer-settings` key* — adds a second Zustand store for the same feature, doubles the persist calls, and means the timer feature has two unrelated stores that consumers must remember to read from. Rejected.
- *New `features/timer/settings.ts` module-level object + hook* — would not get Zustand's reactivity/devtools/persist for free. Rejected.

The merge keeps the public surface of `useTimerStore` consistent: callers already import it, the settings appear as another slice of state, and the timer UI panel reads/writes via existing selector patterns.

### 2. New `features/planner/store.ts` for `weekStartDay` and `browseDate`

The planner feature composes `tasks` and applies a date filter; it does not own any state today. The change introduces a small store with two slices:

- `weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6` (default `1` = Monday)
- `browseDate: string | null` (default `null`; set when the user navigates the date browser)

Both persist under `daybox-planner`. This co-locates the two planner-specific preferences and gives the feature a clear data boundary.

**Alternatives considered:**

- *Two separate `useState` hooks in each consuming component* — would lose the persist behavior. Rejected.
- *One store for the whole app's "preferences"* — would re-introduce the leak we are removing. Rejected.

### 3. `app/theme.ts` as a tiny hook, not a Zustand store

Theme is a single string read by `App.tsx`. A `useTheme()` hook (15–20 lines) backed by a `useState` initialised from `localStorage.getItem('daybox-theme')` and a `useEffect` that mirrors to `document.documentElement.classList.toggle('dark', theme === 'dark')` is the smallest implementation that satisfies the requirement. A Zustand store would be over-engineered for a boolean-ish value used by exactly one component.

**Alternatives considered:**

- *Inline `useState` in `app/App.tsx`* — works, but pushes the persistence concern into the shell component and makes future "set theme from settings panel" code paths read state from a different place than they write. The tiny `app/theme.ts` hook is more discoverable.
- *Zustand store* — overkill; no shared subscribers; only one reader. Rejected.

### 4. `view` inlined as `useState` in `app/App.tsx`, not persisted

The view selector is local navigation state. Reloading the page resets to "Today" today and we keep that behaviour: `view` is a `useState<'today' | 'tomorrow' | 'week' | 'backlog' | 'date'>` in `App.tsx`. No store, no hook module.

**Alternatives considered:**

- *Persist the last view* — would require a new localStorage key just for the active tab, and would couple shell state to disk for no obvious user benefit. Rejected.

### 5. localStorage migration in `App.tsx`, mirroring the existing `daybox-app-store` pattern

The existing migration is a `useEffect` in `App.tsx` with a `useRef` guard. We add a second guarded step that:

1. Reads `daybox-settings` if it exists.
2. Calls `useTimerStore.getState().setTimerSettings(parsed.timer)` (or merges into the new `settings` slice).
3. Calls `usePlannerStore.getState().setPlannerPrefs({ weekStartDay: parsed.weekStartDay })`.
4. Calls the new `setTheme(parsed.theme)` from `app/theme.ts`.
5. Removes `daybox-settings`.

The order of these steps does not matter — they touch different stores. We keep the existing `daybox-app-store` step intact for users still on the v1 key.

**Alternatives considered:**

- *One-time migration in a new `app/migrations.ts` module* — would extract the existing migration too, which is out of scope. Add the new step in the same place to keep churn minimal.

### 6. Export/import glue stays in `app/localStorage.ts`, updated to round-trip five keys

`exportData()` reads from `useTaskStore.getState()`, `useGroupStore.getState()`, `useTimerStore.getState()`, `usePlannerStore.getState()`, and the theme value. The exported JSON shape changes from `{ tasks, groups, settings }` to `{ tasks, groups, timer, planner, theme }` — a **breaking change to the export file format**. The `parseImport()` function is updated to read the new shape. Existing exports (v2) become unreadable after deploy, but `daybox-settings` migration runs first so v2 users keep their data via the in-app migration; the export-format break only affects users who do an export-then-import flow across the deploy.

**Alternatives considered:**

- *Version the export shape (`v: 3` field) and accept v2 + v3 on import* — preserves backward compatibility for cross-deploy exports. **Chosen.** Add a `version: 3` field; `parseImport` accepts `version: 2` and `version: 3`, with the v2 path reading from `settings` and writing to the per-feature stores. This avoids a hard break.

### 7. Test layout mirrors the production layout

- `features/timer/store.test.ts` gains tests for the new `settings` slice (set, partial update, default).
- `features/planner/store.test.ts` is new; covers `weekStartDay` default + set, `browseDate` default + set + step.
- `app/localStorage.test.ts` is updated to round-trip the five-key shape with `version: 3`.
- `app/settingsStore.test.ts` is deleted.
- The existing `app/uiStore.test.ts` does not exist (no current test for the file being deleted); no deletion needed.

## Risks / Trade-offs

- **[Risk] Missed re-exports** — `app/localStorage.ts` is re-exported by the shell `SettingsDrawer`. After splitting, `exportData` may need to accept the per-store reads as arguments or read from `getState()`. The latter is simpler and matches the current pattern. Mitigation: re-run `tsc -b` after each store split.
- **[Risk] Migration order race** — if a user has both `daybox-app-store` (v1) and `daybox-settings` (v2), the order of the two migrations in `App.tsx` matters. The current `daybox-app-store` migration writes *into* `daybox-tasks`, `daybox-groups`, and `daybox-settings`. If we run the v1 migration first and the v2 migration second, the v1 migration's write to `daybox-settings.timer/theme/weekStartDay` is immediately consumed by the v2 migration. If we run the v2 migration first, the v1 migration overwrites `daybox-settings` with v1 data (which has no `timer` etc. because v1 was the unified shape). Mitigation: run the v1 migration first, then the v2 migration; v1 has data for tasks/groups and an old `settings` shape that the v2 migration also reads. Document the order in the migration code with a comment.
- **[Risk] `useTaskStore.setState` in `App.tsx` from the v1 migration** — the existing migration uses `useTaskStore.setState({ tasks })` which bypasses actions. After the change, we use the action-based path for v2 (e.g., `useTimerStore.getState().setTimerSettings(parsed.timer)`). The v1 path is unchanged. Mitigation: keep the v1 path on `setState` (it predates the action API for the legacy data) and use the action API for the v2 path.
- **[Risk] Theme race on first render** — `app/theme.ts` must apply `.dark` to `<html>` before the first paint, otherwise users see a flash of light theme on reload. Mitigation: the existing `useEffect` in `App.tsx` runs after first paint; we will move the class toggle to a synchronous read in `app/theme.ts` (a module-level side effect at import time) so the class is set before the React tree mounts.
- **[Trade-off] Five localStorage keys instead of three** — slightly more keys, but each key has a single owner and a single concern. Easier to reason about and migrate.
- **[Trade-off] `View` type as inline union** — loses the named alias. Acceptable: the union is short (5 values) and used in 2–3 places. If a sixth view is ever added, lift it back into a type alias in `app/App.tsx`.

## Migration Plan

1. Add the new `app/theme.ts`, `features/planner/store.ts`, and the `settings` slice in `features/timer/store.ts`.
2. Add the new actions (`setTimerSettings`, `setPlannerPrefs`).
3. Update the four consumer files to read from the new homes.
4. Update `app/App.tsx` to inline `view`, read `theme` from the new hook, and run the v2 migration in addition to the existing v1 migration.
5. Update `app/localStorage.ts` to round-trip the five-key shape with `version: 3`, and accept `version: 2` on import.
6. Delete `app/settingsStore.ts`, `app/uiStore.ts`, and `app/settingsStore.test.ts`.
7. Update `shared/types.ts` to remove the moved types (`AppSettings`, `TimerSettings`, `View`, `DEFAULT_APP_SETTINGS`, `DEFAULT_TIMER_SETTINGS`). `TimerPhase` and `View` are removed from the type re-exports.
8. Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run format`.

**Rollback strategy:** The migration is one-way per deploy. If a regression is found, revert the deploy; the new `daybox-timer`/`daybox-planner`/`daybox-theme` keys will be ignored by the previous build (it reads from `daybox-settings`), and users who never loaded the new build keep their data. Once the migration is confirmed clean in production, the old `daybox-settings` migration path can be removed in a later change.

## Open Questions

- Should `browseDate` reset to `null` when the user leaves the Date Browser view, or persist? Current behaviour persists the last browsed date. The new `daybox-planner` key preserves this; flagging for product: if reset is desired, add a `useEffect` in `App.tsx` that clears `browseDate` when `view !== 'date'`.
- Should `weekStartDay` be part of the planner store or its own `features/planner/preferences.ts` module with a `usePlannerPreferences()` hook? The hook is nicer for code splitting; the store is simpler. Recommend the store; refactor to a hook if `features/planner/store.ts` grows beyond two slices.
