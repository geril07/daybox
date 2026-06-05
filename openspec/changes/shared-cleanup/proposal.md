## Why

`src/shared/` mixes UI primitives with domain data types and holds leftover Vite scaffold residue. Domain types (`Task`, `Group`, `TimerPhase`) currently live in `shared/types.ts` alongside the cross-feature `View` and `AppSettings` types; per the "shared = no domain/business logic" rule, these belong with the features that own them. The mechanical cleanup of this layer makes the boundary honest and removes the last `shared/` items that aren't primitives, layout-neutral components, or pure utilities.

This change runs **after** `fix-features-to-app-leak` so that `AppSettings`, `TimerSettings`, `View`, `DEFAULT_APP_SETTINGS`, and `DEFAULT_TIMER_SETTINGS` are already removed from `shared/types.ts` by the time this change starts.

## What Changes

- **Delete scaffold residue**:
  - `src/assets/hero.png` (unused Vite-scaffold image)
  - `src/shared/assets/` (empty directory)
- **Move `EmptyState` into the UI primitives folder**:
  - `src/shared/EmptyState.tsx` → `src/shared/ui/EmptyState.tsx`; re-exported from `src/shared/ui/index.ts` so existing `@/shared/ui` consumers keep working
- **Move test setup to `app/`**:
  - `src/shared/test-setup.ts` → `src/app/test-setup.ts`; update `vite.config.ts` `setupFiles` reference
- **Split `src/shared/types.ts` by owner** (the architectural change already removed `AppSettings`/`TimerSettings`/`View`/their defaults):
  - `Task` → `src/features/tasks/types.ts`
  - `Group` → `src/features/groups/types.ts`
  - `TimerPhase` → `src/features/timer/types.ts`
  - `GROUP_COLORS` → `src/features/groups/constants.ts`
- **Update every import path** to the new homes; run `tsc -b` between batches
- **Delete `src/shared/types.ts`** if empty after the move
- **No behavior changes** — every move/rename preserves existing interfaces and tests

## Capabilities

### New Capabilities

- `shared-layer`: Defines the rules for what may live in `src/shared/`. Codifies the existing "shared = primitives, utilities, no domain logic" rule as three requirements: shared contains no domain types, shared UI primitives live in `shared/ui/`, and test infrastructure lives in `app/` (not `shared/`). The change implements each rule by moving the offending files to their correct home.

### Modified Capabilities

<!-- None — existing specs fully cover the behavior. The capability owners are unchanged; only the source file location of their types changes. -->

## Impact

- **Deleted files**: `src/assets/hero.png`, `src/shared/types.ts` (after moves), the `src/shared/assets/` directory, the `src/shared/EmptyState.tsx` file (moved)
- **New files**:
  - `src/shared/ui/EmptyState.tsx`
  - `src/app/test-setup.ts`
  - `src/features/tasks/types.ts`
  - `src/features/groups/types.ts`
  - `src/features/groups/constants.ts`
  - `src/features/timer/types.ts`
- **Modified files**: every `.ts`/`.tsx` that imports `Task`, `Group`, `TimerPhase`, or `GROUP_COLORS` from `@/shared/types` (re-point to the owning feature's `types`/`constants`); every `.ts`/`.tsx` that imports `EmptyState` from `@/shared/EmptyState` (re-point to `@/shared/ui`); `vite.config.ts` (test-setup path)
- **No test changes required** — the existing tests already use the moved types via `import type` and re-routing them is mechanical
- **No new dependencies introduced**
- **Risk**: import churn across ~15 files. Mitigation: `rg "from '@/shared/types'"` before and after to catch missed imports; run `tsc -b` after each batch of moves
