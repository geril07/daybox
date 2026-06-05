## Context

`src/shared/` is the catch-all layer. After `fix-features-to-app-leak` removes the cross-feature types (`AppSettings`, `TimerSettings`, `View`, and the `DEFAULT_*` constants), the remaining types in `src/shared/types.ts` are:

- `Task` — used by `features/tasks/`, `app/localStorage.ts`, and tests
- `Group` — used by `features/groups/`, `features/tasks/components/AddTaskRow.tsx`, `app/localStorage.ts`, and tests
- `TimerPhase` — used by `features/timer/store.ts` and tests
- `GROUP_COLORS` — used by `features/groups/store.ts`

The rule "shared = no domain/business logic" says these belong with the feature that owns the data. The previous `reorganize-features-by-domain` change left types in `shared/` because the architectural split wasn't yet done; this change finishes that work.

In addition, three items are out of place for non-type reasons:

- `src/shared/EmptyState.tsx` is a UI primitive sitting outside the `shared/ui/` folder where its peers live
- `src/shared/test-setup.ts` is test infrastructure (Vitest global stubs), not a shared primitive or utility
- `src/assets/hero.png` and `src/shared/assets/` are leftover Vite scaffold residue

## Goals / Non-Goals

**Goals:**

- Move every type in `src/shared/types.ts` to the feature that owns it
- Move `EmptyState` into `src/shared/ui/` next to its peers; re-export from `@/shared/ui` so existing imports keep working
- Move test infrastructure out of `src/shared/`
- Delete unused scaffold files
- Every existing test must pass after each batch of moves

**Non-Goals:**

- No new types added or removed
- No type-level refactors (e.g., introducing branded types, splitting `Task` into `TaskInput`/`TaskOutput`)
- No changes to the persistence or store layer
- No changes to `cn` (`shared/lib/utils.ts`) — it's a primitive utility used by both `shared/ui/` and features, so its current home is correct

## Decisions

### 1. One types file per feature, not a per-feature `types/` directory

Each feature has a single `types.ts` at the feature root rather than `types/index.ts` or a `types/` subfolder. The features are small (1–3 types each), and a single file is easier to navigate and to import from. Future growth (e.g., when `tasks` gains `TaskDraft`) still fits in one file; if a feature ever needs a deeper split, that can be done in a follow-up.

**Alternatives considered:**

- _Per-feature `types/` subfolder_ — over-engineered for the current size; adds a directory layer. Rejected.
- _Co-locate types inside each store_ — splits related types across files (`store.ts` and `types.ts`); harder to scan. Rejected.

### 2. `GROUP_COLORS` lives in `src/features/groups/constants.ts`, not `types.ts`

It's a runtime constant array, not a type. Co-locating with types in `types.ts` would conflate "shape" and "value". A separate `constants.ts` is clearer and matches typical feature folder conventions.

### 3. `EmptyState` re-exported from `@/shared/ui`

The four planner views currently import `EmptyState` from `@/shared/EmptyState`. After the move, they could import from `@/shared/ui/EmptyState` directly, but re-exporting from `@/shared/ui` (the existing barrel) means consumer files do not change. This keeps the diff focused on the file move itself, not on import churn in feature files.

### 4. `test-setup.ts` moves to `src/app/` because it's a tool/config concern, not a shared primitive

The file is a Vitest setup that stubs `ResizeObserver`. The reference in `vite.config.ts` becomes `./src/app/test-setup.ts`. No consumer code imports it (it's a tool entry point), so the move is a single line in `vite.config.ts`.

**Alternatives considered:**

- _Keep it in `shared/`_ — it is a global stub, not a "shared primitive", and the rule says `shared/` is for primitives and utilities. Rejected.
- _Move to a new `src/test/` directory_ — adds a new top-level folder for a 10-line file. Rejected.

### 5. `cn` (`shared/lib/utils.ts`) is left in place

`cn` is used by both `shared/ui/` and by features (e.g., `TaskRow`, `TimerBar`). It is a true shared utility, not a UI primitive, so `shared/lib/` is the correct home. The existing `shared/ui/index.ts` already re-exports `cn` from `'../lib/utils'`, so UI consumers have a single import path either way.

## Risks / Trade-offs

- **[Risk] Missed import in feature code** — every file that imports `Task`/`Group`/`TimerPhase`/`GROUP_COLORS` from `@/shared/types` must be updated. **Mitigation:** `rg "from '@/shared/types'" src` before and after; `tsc -b` after each batch.
- **[Risk] `verbatimModuleSyntax` failure on moved types** — moving `export interface` and `export type` declarations is purely structural and should not affect type-only imports. **Mitigation:** run `tsc -b`; if any consumer used a value import, fix to `import type`.
- **[Risk] `Group` import in `AddTaskRow.tsx`** — this file is in `features/tasks/` and uses `Group` from `@/shared/types`. After the move, it imports from `@/features/groups` (a cross-feature public import, allowed by the layering rule). **Mitigation:** the import is already a cross-feature import via the barrel; just point to the new source.
- **[Trade-off] `EmptyState` re-export is a tiny indirection** — feature code imports from `@/shared/ui` (a barrel) instead of `@/shared/ui/EmptyState` (the file). The barrel already exists; one more line doesn't make the indirection meaningfully worse.

## Migration Plan

The change is purely file-system moves and import rewrites. No runtime data shape changes, no localStorage key changes, no user-visible behaviour changes.

1. Delete `src/assets/hero.png` and the empty `src/shared/assets/` directory.
2. Move `EmptyState.tsx` from `src/shared/` to `src/shared/ui/`. Add a re-export line in `src/shared/ui/index.ts`.
3. Move `test-setup.ts` from `src/shared/` to `src/app/`. Update `setupFiles` in `vite.config.ts`.
4. Create `src/features/tasks/types.ts` with the `Task` interface. Re-point all `@/shared/types` imports of `Task`.
5. Create `src/features/groups/types.ts` with the `Group` interface and `src/features/groups/constants.ts` with `GROUP_COLORS`. Re-point all consumers.
6. Create `src/features/timer/types.ts` with the `TimerPhase` type. Re-point consumers.
7. Delete `src/shared/types.ts`.
8. Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run format`.

**Rollback strategy:** Revert the commit. No data migration, no API changes, no user-visible state. Safe to roll back at any point.

## Open Questions

- None. This change is mechanical and follows directly from the previous `fix-features-to-app-leak` change plus the explicit "shared = no domain" rule.
