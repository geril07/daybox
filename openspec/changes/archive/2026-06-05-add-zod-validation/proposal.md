## Why

DayBox is a local-first SPA whose entire state surface — every task, every group, every timer setting — is round-tripped through `localStorage` and, optionally, through user-supplied JSON files (export/import). Today, both boundaries are unvalidated: `parseImport` runs hand-rolled `coerce*` helpers with silent fallbacks, zustand's `persist` middleware rehydrates whatever shape it finds on disk, and the two legacy migrations in `App.tsx` swallow corruption with a bare `catch {}`. As the data model grows (new fields, new settings, new entities), this leniency becomes a quiet source of data loss and a blocker for evolving the shape. Adding **zod v4** lets us collapse the type/shape/validation trinity into a single source of truth and put explicit, per-layer policy at every trust boundary.

## What Changes

- Add `zod` (v4 latest) as a runtime dependency.
- Introduce a co-located `<feature>/schema.ts` per feature (tasks, groups, timer, planner, theme). Each schema is the source of truth; the existing `types.ts` files are reduced to `export type Task = z.infer<typeof TaskSchema>` (and equivalents).
- Replace hand-rolled `coerce*` helpers in `parseImport` with a per-layer validation pipeline:
  - **Top-level** (envelope, version, arrays-present) → **hard fail** with a user-visible error.
  - **Per-record** (`Task`, `Group`) → **warn + skip** the invalid record, continue with the rest. Detailed reason appended to `warnings[]`.
  - **Cross-references** (task `groupId` → real group) → **warn + reassign** to default group (preserves current behavior, surfaces dangling refs).
  - **Optional / derived fields** (browseDate, theme, alarmVolume) → **coerce to default** when missing or invalid.
- Add rehydration validation to all four persisted zustand stores (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`) via a shared `createValidatedPersist` helper. On schema failure, the store replaces state with initial defaults rather than booting with a half-broken blob.
- Upgrade the two legacy migrations in `App.tsx` to validate the parsed shape before writing to the new stores; surface failures in the console as warnings (the data is older than our logging, but we stop corrupting the new state silently).
- Add length-bound schemas to the two user-input flows that currently trim but don't bound: task title (max 280), group name (max 40).
- Add validation to `setTimerSettings` so dev-tools or programmatic callers can't bypass the `NumberInput` min/max bounds.
- New unit tests:
  - All `parseImport` cases (valid v3, valid v2, malformed tasks/groups/timer/planner, dangling groupIds, type coercion).
  - Rehydration fallback for each store.
  - Length caps on `addTask` and `addGroup`.

## Capabilities

### New Capabilities

- `data-validation`: Defines the schema-first validation policy (per-layer routing of `safeParse` failures) and the co-location convention. Single new spec at `specs/data-validation/spec.md`.

### Modified Capabilities

- `data-persistence`: Adds three new requirements covering (1) import-time per-layer validation policy, (2) persist-rehydration fallback semantics, (3) typed migration of the legacy `daybox-app-store` and `daybox-settings` keys. No existing requirements removed; all new requirements sit alongside.

## Impact

- **Runtime deps**: adds `zod` (~12 kB gzipped, v4 latest). Acceptable per the discussion.
- **Source**: 4 new schema files (`features/{tasks,groups,timer,planner}/schema.ts`), 1 new shared module (`shared/lib/persistence.ts` for `createValidatedPersist`), rewrites of `app/localStorage.ts` and `app/App.tsx` migration effects, and `types.ts` reductions to inferred types.
- **API surface**: none — store action signatures and `parseImport` / `ImportResult` shapes are unchanged from the caller's perspective (warnings may contain more detail).
- **Failure modes**: import warnings are more accurate (per-record reasons instead of just missing-groupId). Rehydration fallbacks now visible in console; the UI does not surface "your blob was corrupt" — out of scope for this change.
- **Bundle**: ~12 kB gzipped for zod v4. No code-splitting impact (single-bundle SPA).
