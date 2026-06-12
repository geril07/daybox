## Why

The current data-portability feature mixes unrelated responsibilities: JSON parsing, version detection, migration, envelope validation, per-slice validation, cross-reference repair, and store mutation are spread across functions whose names do not describe all of their side effects. This makes the code fragile as new persisted domains are added, especially with the active routines work that will add another snapshot field and version migration.

## What Changes

- Redesign data-portability around a staged single-responsibility pipeline: parse JSON, read version, migrate to current, validate current snapshot, normalize current snapshot, and apply current snapshot.
- Replace the registry-driven core path with an explicit app snapshot aggregate owned by data-portability and composed from feature-owned schemas and stores.
- Introduce a typed `CurrentSnapshot`/current envelope schema that validates all current snapshot fields, not only the envelope shell.
- Change default import/restore semantics from partial per-slice salvage to all-or-nothing current snapshot restore after migration and normalization.
- Keep dangling task `groupId` repair as a normalization step before final apply, with warnings returned to callers.
- Preserve the public file export and Google Drive backup/restore user flows, while allowing the TypeScript API names to become more precise if a compatibility wrapper is useful during migration.
- Remove `Slice<T>` and the slice registry from the main snapshot/restore path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-portability`: Redefine snapshot/restore as an explicit staged pipeline with single-purpose modules, typed current snapshot validation, normalization before apply, and all-or-nothing current restore semantics.
- `data-validation`: Replace the old import-specific per-record salvage policy with whole-snapshot import validation plus explicit normalization for repairable references, while preserving schema-first types and rehydration policy.
- `data-persistence`: Align file export/import requirements with the current no-theme snapshot and prepare/commit all-or-nothing import flow.
- `google-drive-backup`: Align restore and round-trip requirements with `prepareSnapshotImport`/`commitSnapshotImport` instead of `validateSnapshot`/`applySnapshot` or legacy `parseImport`/`applyImport` language.

## Impact

- Affected code: `src/features/data-portability/*`, tests under `src/features/data-portability/`, and any now-unused `slice.ts`/registry exports if the implementation removes them.
- Affected consumers: `src/app/shell/SettingsDrawer.tsx` and `src/features/google-drive/store.ts` continue to use the data-portability public surface for export/import/restore, moving from `validateSnapshot` + `applySnapshot` to the prepare/commit API.
- Affected specs: `openspec/specs/data-portability/spec.md`, `openspec/specs/data-validation/spec.md`, `openspec/specs/data-persistence/spec.md`, and `openspec/specs/google-drive-backup/spec.md` are updated so the import/restore contract is consistent.
- Dependencies: no new runtime dependency expected.
