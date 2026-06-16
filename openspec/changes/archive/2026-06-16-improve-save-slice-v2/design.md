## Context

DayBox's data-portability pipeline (`buildSnapshot` → `prepareSnapshotImport` → `commitSnapshotImport`) uses a `SaveSlice` contract defined in `src/shared/save-slice/`. Each feature (`groups`, `tasks`, `timer`, `planner`) implements the contract. The pipeline iterates registered slices in dependency order.

The current contract (`v1`) has accumulated several weaknesses surfaced in audit:

- `currentVersion` is declared on every slice but never read by the pipeline — dead weight with no migration path.
- Zod error formatting (`safeParse` → issue extraction → error string) is copypasted identically across 4 slices (×5 when routines lands).
- Duplicate-ID detection is copypasted in `groups` and `tasks` slices.
- Cross-slice invariant repair (`normalizeCrossSliceInvariants`) is a hardcoded singleton that knows about groups and tasks internally. Adding a feature (e.g., routines) that depends on another slice requires editing this centralized file.
- `commitSnapshotImport` has no error handling — if `applyImport` throws mid-loop, some stores are partially committed with no report.
- `buildSnapshot` has no export-side validation — a corrupted store produces a broken export file that only fails on re-import.
- The `postPrepare` parameter is untyped (`Record<string, unknown>`), losing the structural knowledge that the registry already holds at the type level.

The `add-daily-routines` change (in progress) will add a 5th slice. This is the right moment to harden the abstraction before the duplication multiplies.

## Goals / Non-Goals

**Goals:**

- Add migration support to `SaveSlice` so slices can declare upgrade chains (v1→v2→v3).
- Eliminate duplicated validation code across all slice implementations.
- Move cross-slice invariant repair into the dependent slice's `postPrepare` hook, enabling new features to declare their own repair logic without editing a central file.
- Add commit error handling so partial writes are detectable and reported.
- Add export-side validation to catch corrupt store data before writing to file.
- Type the `allSlices` parameter in `postPrepare` entries (the full slice map, not `Record<string, unknown>`).
- Simplify `MissingSliceStrategy` by replacing the lazy `getDefault` function with an eager `defaultValue`.

**Non-Goals:**

- Envelope-level migration (`envelopeVersion: 2`). The envelope stays at `v1`.
- Adopting `neverthrow` or any new dependency. The existing `{ ok, value } | { ok: false, reason }` discriminated union stays.
- Changing the registry structure or slice ordering.
- Adding a runtime schema for the full `CurrentSnapshot` (stays as a TypeScript-level type with zod validated per-slice).
- Changing the UI layer (SettingsDrawer remains unchanged).

## Decisions

### D1: Module augmentation for `allSlices` typing

An empty interface `SaveSliceMap` is declared in `src/shared/save-slice/map.ts`. The `postPrepare` callback's `allSlices` parameter defaults to `SaveSliceMap`. The registry in `data-portability/registry.ts` uses TypeScript's `declare module` to augment the interface with the concrete slice types:

```typescript
declare module '@/shared/save-slice/map' {
  interface SaveSliceMap {
    groups: GroupsSaveSliceCurrent
    tasks: TasksSaveSliceCurrent
    // ...
  }
}
```

This is zero-runtime-cost (the interface and augmentation are compile-time only). No import cycles are created — the registry already imports from feature barrels, and feature slices only import from shared. Slices get fully-typed `allSlices.groups.groups.map(...)` without specifying explicit type parameters.

**Alternative rejected (type provider):** Each slice manually declares its dependencies as a type parameter (`SaveSlice<'tasks', V2, { groups: GroupsV2 }>`). This works but requires every slice to spell out its deps redundantly and the pipeline must cast when calling `postPrepare`. Module augmentation is the standard TS pattern for this (used by libraries like `@mui/material`, `vue-router`, `koa`).

**Alternative rejected (runtime zod gate):** Each `postPrepare` validates the slice it depends on with zod at runtime. This is runtime-safe but verbose, splits validation across locations, and discards compile-time information the registry already possesses.

### D2: v2 `SaveSlice` contract fields

The contract gains four optional fields and one change:

| Field                  | Kind    | Purpose                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateExport?`      | new     | Called by `buildSnapshot` after `exportSlice`. Zod-validates store output. Failure aborts the export with a message.                                                                                                                                                                                                                                                                                                 |
| `postPrepare?`         | new     | `(current: TCurrent, allSlices: SaveSliceMap) => PrepareResult<TCurrent>`. Called by the import pipeline after ALL slices have been prepared. Owns cross-slice invariant repair.                                                                                                                                                                                                                                     |
| `migrateFrom?`         | new     | `Record<number, SliceMigration>`. Key = fromVersion (e.g., `1`), value = `(input: unknown) => PrepareResult<unknown>`. The pipeline walks this chain before `prepareImport`. Only declared for versions older than `currentVersion`, so migrations[1] means the slice can migrate from v1 to v1+1 (v2). `currentVersion: 1` slices have no `migrateFrom` (and don't need one — `prepareImport` handles v1 directly). |
| `missing.defaultValue` | changed | Replaces `missing.getDefault: () => TCurrent` (lazy) with `missing.defaultValue: TCurrent` (eager). All current defaults are compile-time constants (`DEFAULT_TIMER_SETTINGS`, `{ weekStartDay: 1, browseDate: null }`). The lazy wrapper is unnecessary.                                                                                                                                                            |
| `TCurrent` constraint  | added   | `TCurrent extends { version: number }`. Every slice payload carries a `version` field. The migration chain reads it.                                                                                                                                                                                                                                                                                                 |

### D3: Shared validation helpers

Two functions in `src/shared/utils/save-helpers.ts`:

```typescript
export function parseSliceInput<T>(
  sliceName: string,
  schema: ZodSchema<T>,
  input: unknown,
): PrepareResult<T>

export function detectDuplicateId<T>(
  items: T[],
  getId: (item: T) => string,
  label: string,
  sliceName: string,
): string | null // null = no duplicates, string = error message
```

`parseSliceInput` wraps `schema.safeParse(input)` and formats the first zod error into the standard `{ ok: false, reason: "sliceName.path: message" }` shape. Replaces the 8-line block duplicated in every slice's `prepareImport`.

`detectDuplicateId` replaces the manual `Map<string, number>` loop duplicated in groups and tasks slices.

These live in `src/shared/utils/` (not `shared/save-slice/`) because they depend on zod, which the generic save-slice contract deliberately avoids.

### D4: Migration chain design

The pipeline inserts a migration stage between envelope parsing and per-slice `prepareImport`:

```
envelope parsed
    ↓
for each slice:
  1. detect version from input (the slice-level `version` field)
  2. while version < slice.currentVersion:
     a. call slice.migrateFrom[version]
     b. version += 1
  3. call slice.prepareImport(migratedData)
```

Migrations are single-hop (v1→v2, not v1→v3 directly). Each hop is a small, independently testable function. The pipeline applies them sequentially. If any migration fails, the entire import fails — no partial upgrade.

A slice at `currentVersion: 5` would declare `migrateFrom: { 1: v1tov2, 2: v2tov3, 3: v3tov4, 4: v4tov5 }`. A v3 import file hits migrations 3 and 4, then `prepareImport` receives v5 data.

**Alternative considered (migration as part of prepareImport):** The slice detects the version itself and runs migrations internally. This was the v1 approach (the "prepareImport owns migrations" scenario in the spec). The problem: every slice reinvents the "walk version chain" loop. Extracting it into the pipeline gives a single implementation with consistent error messages.

### D5: postPrepare replaces centralized normalizer

The `normalizeCrossSliceInvariants` function in `src/modules/data-portability/normalize.ts` is deleted. Its logic (repair dangling task `groupId` references) moves into `tasks.save.slice.postPrepare`.

The pipeline runs all slices' `prepareImport` first (populating `preparedSlices`), then runs all slices' `postPrepare` (each receives `(ownData, allPreparedSlices)`). Order: same as `saveSlices` array.

A slice without cross-slice dependencies (groups, timer, planner) has no `postPrepare`. A slice that depends on another (tasks → groups) implements `postPrepare`. A future slice (routines) can implement `postPrepare` to clean orphaned `stepCompletionsByDate` entries without modifying any central file.

### D6: Commit error handling

```typescript
export type CommitSnapshotImportResult =
  | { ok: true }
  | { ok: false; reason: string; committed: string[] }
```

The commit loop wraps each `applyImport` call in try/catch. On failure, it reports which slice threw and which slices were already committed. No rollback — but the caller can inspect `committed` to inform the user.

### D7: Export validation in buildSnapshot

`buildSnapshot` calls `slice.validateExport(value)` after `slice.exportSlice()`. If validation fails, the export aborts and the caller receives an error message. This catches store corruption (e.g., manually edited localStorage) at export time instead of at import time.

Slices that currently do no export validation (groups, tasks, timer, planner) get `validateExport` set to a call through `parseSliceInput` with their current version schema. This adds trivial overhead but catches structure corruption.

### D8: Envelope parsing hardening

Four changes to `envelope.ts` and `build.ts`:

**Standardize result type:** `parseSaveEnvelope` returns `PrepareResult<SaveEnvelope>` instead of the custom `ParseEnvelopeResult` type. The `envelope` field becomes `value` to match every other stage.

**Structured zod errors:** Instead of `{ ok: false, reason: 'Not a DayBox export file.' }` for all envelope failures, extract the first zod issue's path and message (same `parseSliceInput` pattern): `"envelope.envelopeVersion: Expected 1, received 2"` or `"envelope.slices: Expected object, received string"`.

**Validate slice keys against registry:** After zod validation, `parseSaveEnvelope` checks that every key in `slices` matches a registered slice name from the registry. Unknown keys get `"envelope.slices.unknownKey: Unknown slice — not a registered feature"`. This manual check keeps the zod schema purely structural (`z.record(z.string(), z.unknown())`) and puts the key validation where it's read — in `parseSaveEnvelope` itself.

**Export-time envelope validation in `buildSnapshot`:** After assembling the envelope, call `SaveEnvelopeSchema.safeParse(snapshot)` before returning. If it fails, abort with a structured error. This is a safety net that costs one `safeParse` call and catches structural bugs at build time.

The `envelope.ts` file imports `knownSliceNames` from `registry.ts`. No import cycle is created: `registry.ts` does not import from `envelope.ts`.

**Alternative rejected (validate slice keys in a separate function):** Could add a `validateSliceKeys(envelope, registry)` in `import.ts` instead of inside `parseSaveEnvelope`. Rejected because the envelope parser is the natural gate — the function that validates envelope shape should also validate envelope contents at the key level. Separating them opens a window where code parses an envelope but forgets to validate keys.

**Alternative rejected (unknown slice = warning, not error):** Could treat unknown keys as warnings (`"Ignoring unknown slice 'custom'"`) instead of rejecting. Rejected for v1 because unknown keys in an import file are either user error (mistyped) or tampering — both warrant a hard reject. If forward-compat with future slices is needed later, the registry could expose `knownSliceNames` and `parseSaveEnvelope` could be parameterized with `strict: boolean`.

## Risks / Trade-offs

- [Risk] `declare module` is uncommon syntax and may confuse contributors. → Mitigation: add a comment block in `save-slice/map.ts` explaining the pattern with an example.
- [Risk] Adding a slice requires touching two places in the registry (the `saveSlices` array and the `declare module` block). → Mitigation: this is already the case — the `SaveSliceExportSlice` type in the registry also needs updating. The `declare module` block replaces `SaveSliceExportSlice` rather than adding a third touchpoint.
- [Risk] The migration chain applies migrations to input data that may be entirely malformed (e.g., wrong shape, missing fields). → Mitigation: each migration function validates its input with the source version's schema before transforming. If validation fails, the raw zod error propagates. This is the same pattern `prepareImport` already uses.
- [Risk] `postPrepare` runs after all slices prepare, so a bug in one slice's `postPrepare` could reject an import that was valid up to that point. → Mitigation: `postPrepare` is strictly for cross-slice repair (warnings + fixups), not validation. The `prepareImport` stage handles structural validation and hard rejections. `postPrepare` should only return `{ ok: false }` in truly unrecoverable cases (e.g., groups missing entirely and tasks can't repair).

## Open Questions

1. **`neverthrow` adoption?** Deferred. The existing discriminated union stays. If the team later wants `combineWithAllErrors` for all-errors-at-once import validation, neverthrow can be adopted without changing the `SaveSlice` contract — only the pipeline internals change.

2. **`envelopeVersion: 2`?** Not needed now. The current hardening (structured errors, key validation, export-time schema check) makes the v1 envelope robust enough for the foreseeable slice set. If `envelopeVersion: 2` is ever needed (e.g., adding envelope-level metadata or changing the `slices` structure), the `parseSaveEnvelope` function would be the single migration point — the design already isolates envelope concerns from slice concerns.

3. **Should `routines.save.slice` (from add-daily-routines) use v1 or v2 contract?** v2 — since it's being created fresh and the v2 contract is backwards-compatible (all new fields are optional). The `add-daily-routines` change specs should reference this design.
