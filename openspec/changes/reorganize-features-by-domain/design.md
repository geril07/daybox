## Context

Current `src/features/` has structural issues after `store-split`: `features/views/` is a UI projection not a domain, `features/settings/` is an aggregator that composes settings from multiple features, and `features/groups/` has no internal folder structure. These all pre-date the `store-split` but the clean store boundaries now highlight the folder mismatch. No behaviour changes are involved — every move/rename preserves existing interfaces.

## Goals / Non-Goals

**Goals:**

- Each `features/<domain>/` folder represents one coherent capability
- `features/planner/` replaces `features/views/` as the planning domain
- `features/tasks/queries.ts` extracts inline filter/sort logic from the 5 planner views
- `features/settings/` dissolved; its parts move to owning features (`TimerSettingsPanel` → timer, `GroupSettingsPanel` → groups) or to `app/shell/` (`SettingsDrawer`)
- Every feature module gets a `components/` subfolder to flatten at the feature level

**Non-Goals:**

- No behavior/interface changes — every existing import path is updated but the exported APIs remain identical
- No view collapse — the 5 individual planner view components stay separate (deferred to future change)
- No test additions — existing 32 tests must pass unmodified after all path changes
- No dependency changes — no new packages or external APIs

## Decisions

1. **`queries.ts` as a module, not a hook** — filter/sort logic stays as pure functions (selectors on Zustand state) rather than custom hooks, making them testable without React and usable from event handlers (e.g., drag reorder). The 5 view components call these selectors in their render body instead of inlining the same logic.

2. **`SettingsDrawer` → `app/shell/`** — it is an app-shell concern (composes panels from multiple features, manages drawer open/close state via `uiStore`) not a feature. Naming it `shell/` clarifies it orchestrates layout, not domain logic.

3. **`GroupSettings` → `GroupSettingsPanel`** — the existing name `GroupSettings` collides with both the settings drawer and the group store's conceptual "settings." The `Panel` suffix makes it clear this is a composable UI piece, consistent with `TimerSettingsPanel`.

4. **Defer view collapse** — the 5 planner views (Today, Tomorrow, Week, Backlog, DateBrowser) have enough behavioural differences (empty states, Overdue section, etc.) that collapsing them into a parameterised component adds risk without immediate benefit. Can be done as a follow-up change.

5. **Flat `components/` per feature** — no deeper nesting (e.g., `components/ui/`, `components/form/`). Each feature has at most 3-5 components, so a single subfolder is sufficient. Further hierarchy can be introduced when a feature grows beyond ~7 components.

## Risks / Trade-offs

- **[Risk] Import churn** → Every `.tsx`/`.ts` file in `src/` that imports from moved modules needs updating. Use search-and-replace per module; run `tsc -b` and `vitest` between each batch to catch missed imports.
- **[Risk] Missed re-exports** → If a barrel `index.ts` re-exports from moved modules, it must be updated. Verify by running `tsc -b` after all moves.
- **[Risk] `queries.ts` extract misses edge cases** → The 5 views use subtly different filter/sort logic. Extract the common core first (byDate, byGroup, overdue check); keep view-specific sorting inline. Tests on `queries.ts` validate correctness independently.
- **[Trade-off] No spec changes** → Because this is pure structural refactor, the existing spec set (`task-management`, `time-views`, `group-management`, `pomodoro-timer`, `settings`, etc.) remains accurate. This is correct but means the new `planner` domain name doesn't appear in specs until a future behaviour change touches those views.
