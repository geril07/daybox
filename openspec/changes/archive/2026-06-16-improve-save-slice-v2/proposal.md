## Why

The `SaveSlice` contract and data-portability pipeline have accumulated dead fields, duplicated validation code, hardcoded cross-slice repair logic, and no path for schema evolution. With `add-daily-routines` about to add a fifth slice to the registry, the duplication compounds and the lack of migration support becomes a real risk.

## What Changes

- **v2 `SaveSlice` contract** — `currentVersion` becomes operational (drives migration chain), `validateExport` added, `postPrepare` added (replaces hardcoded normalizer), `migrateFrom` added (version upgrade chain), `getDefault` replaced with eager `defaultValue`.
- **Shared helpers** — `parseSliceInput()` and `detectDuplicateId()` extracted to eliminate the repeated zod error formatting (×4) and duplicate-id detection (×2) patterns across all slices.
- **Type-safe `postPrepare` parameter** — Module augmentation interface `SaveSliceMap` in `shared/save-slice/map.ts`, populated by the registry via `declare module`. Slices get fully-typed `allSlices` in their `postPrepare` hooks with zero runtime cost and zero import cycles.
- **Migration pipeline** — `prepareSlice()` in data-portability chains `migrateFrom[version]` entries before `prepareImport`, supporting v1→v2→v3 upgrade paths per slice.
- **Export validation** — `buildSnapshot` calls optional `validateExport` on each slice, catching corrupt store data before writing to file.
- **Commit error handling** — `commitSnapshotImport` wraps the apply loop in try/catch and reports which slices were touched on failure.
- **Delete centralized normalizer** — `normalizeCrossSliceInvariants` removed; dangling group-reference repair moves into `tasks.save.slice.postPrepare`. New features declare their own cross-slice invariants without editing a central file.
- **`MissingSliceStrategy` simplification** — `getDefault` (lazy) → `defaultValue` (eager); all defaults are constants.
- **Envelope parsing hardening** — `parseSaveEnvelope` returns `PrepareResult<SaveEnvelope>` (standardizing with the rest of the pipeline), reports structured zod errors (path + message) instead of opaque `"Not a DayBox export file."`, and validates that `slices` keys match registered slice names (rejecting unknown slices with a clear message). `buildSnapshot` runtime-validates the assembled envelope against `SaveEnvelopeSchema` before returning.

## Capabilities

### New Capabilities

None. This change modifies existing abstractions, not introducing new domain capabilities.

### Modified Capabilities

- `data-portability`: Pipeline stages change (add migration chain + postPrepare stage, remove hardcoded normalizer), commit gets error handling, build gets export validation. The `SaveSlice` contract itself (currently a shared type) moves its contract shape — the data-portability spec must reflect the new pipeline stages and slice contract fields.
- `shared-layer`: New shared utilities (`save-helpers.ts` for `parseSliceInput`/`detectDuplicateId`, `save-slice/map.ts` for the module augmentation interface) and expanded `SaveSlice` contract fields. The shared-layer spec must cover the new helpers directory and the augmentation interface pattern.

## Impact

- `src/shared/save-slice/save-slice.ts` — contract rewritten (v2 fields)
- `src/shared/save-slice/map.ts` — new file (empty interface for module augmentation)
- `src/shared/utils/save-helpers.ts` — new file (`parseSliceInput`, `detectDuplicateId`)
- `src/modules/data-portability/build.ts` — calls `validateExport`, validates assembled envelope against schema, uses `PrepareResult`
- `src/modules/data-portability/import.ts` — migration chain loop, postPrepare stage, commit try/catch, uses `PrepareResult`
- `src/modules/data-portability/envelope.ts` — `parseSaveEnvelope` returns `PrepareResult<SaveEnvelope>`, structured errors, validates slice keys against registry
- `src/modules/data-portability/registry.ts` — `declare module` augmentation block
- `src/modules/data-portability/normalize.ts` — **deleted**
- `src/modules/data-portability/index.ts` — barrel updated (no more normalize export)
- `src/modules/groups/save/slice.ts` — uses shared helpers, `defaultValue`, `currentVersion` still `1`
- `src/modules/tasks/save/slice.ts` — uses shared helpers, `defaultValue`, adds `postPrepare`, `currentVersion` still `1`
- `src/modules/timer/save/timer-settings-slice.ts` — uses shared helpers, `defaultValue`
- `src/modules/planner/save/slice.ts` — uses shared helpers, `defaultValue`
- `src/modules/routines/save/slice.ts` — (from add-daily-routines) already uses v2 contract
- All slice, pipeline, and shared-helper test files — updated for new signatures
- `src/modules/data-portability/pipeline.test.ts` — new test cases for migration chain, export validation, commit error handling, postPrepare
