## Why

The current `src/features/` structure mixes domains with UI projections and aggregator components, making navigation confusing and new contributors slower. `features/views/` is not a domain (5 files that all filter tasks by date), `features/settings/` is an aggregator (composes group+timer+theme settings), and `features/groups/` has flat files with no internal structure. This refactor aligns the folder layout with the actual domain model so each feature folder represents one coherent capability.

## What Changes

- **`features/views/` → `features/planner/`** — the date-bucket planning views get their own domain folder; inline filter+sort logic extracted into `features/tasks/queries.ts`
- **`features/settings/` dissolved** — `SettingsDrawer` moves to `app/shell/` (it's an app-shell component); settings panels move to their owning feature (timer, groups)
- **`features/groups/` gets `components/` subfolder** — 3 flat group files organised into `components/`
- **`features/tasks/` gets `components/` + `queries.ts`** — flat task files go into `components/`; reused filter/sort logic extracted into `queries.ts`
- **`features/timer/` gets `components/`** — `TimerBar` moves into `components/`; `TimerSettingsPanel` extracted
- **No behavior changes** — every move, rename, and extract preserves existing behaviour and interfaces

## Capabilities

### New Capabilities

<!-- No new capabilities — this is a pure structural refactor with no spec-level behaviour changes. -->

### Modified Capabilities

<!-- No requirement changes — existing specs fully cover the behaviour. Only implementation structure changes. -->

## Impact

- Every import from `@/features/views/*`, `@/features/settings/*`, flat `@/features/groups/*`, and flat `@/features/tasks/*` must be rewritten
- `SettingsDrawer` import changes from `@/features/settings/SettingsDrawer` to `@/app/shell/SettingsDrawer`
- `features/settings/` folder is removed entirely
- Group `GroupSettings` renamed to `GroupSettingsPanel`
- New file: `features/tasks/queries.ts` with extracted filter/sort selectors
- All 32 existing tests must continue passing unmodified
- No new dependencies introduced
