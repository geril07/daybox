## Context

DayBox stores app state locally and uses data-portability for file export/import and Google Drive backup/restore. The current implementation was extracted from app bootstrap into `src/features/data-portability/`, but it still combines responsibilities in ways that make the code hard to reason about:

- `validateSnapshot` parses JSON, detects version, migrates v2 to v3, and validates the envelope shell.
- `applySnapshot` validates slice payloads, mutates stores, and then performs cross-reference repair after mutation.
- The `Slice<T>` registry looks generic, but task/group repair is domain-specific and requires casts/string lookups.
- Invalid slice payloads are partially salvaged by default, which is fragile for backup/restore semantics.

The redesign treats data-portability as the app snapshot boundary rather than a plugin registry. Feature schemas remain the source of truth for feature-owned shapes, while data-portability explicitly owns the aggregate snapshot contract and the import pipeline.

## Goals / Non-Goals

**Goals:**

- Give each data-portability module one reason to change.
- Make the current snapshot a typed aggregate validated by zod from feature-owned schemas.
- Keep migration separate from current-shape validation.
- Keep normalization separate from validation and store mutation.
- Make apply a store-write operation that receives an already valid, normalized snapshot.
- Make default import/restore all-or-nothing after migration/normalization.
- Keep file export/import and Google Drive backup/restore behavior understandable and testable.

**Non-Goals:**

- No UI redesign for import/export or Google Drive restore.
- No new cloud behavior or sync mode.
- No generic plugin framework for future features.
- No best-effort partial restore mode in this change.
- No migration of browser localStorage, because this change concerns exported snapshot files and restore code paths.

## Decisions

### Model the snapshot as an explicit aggregate

Define a current snapshot schema by composing feature schemas directly:

```ts
export const CurrentSnapshotSchema = z.object({
  version: z.literal(CURRENT_SNAPSHOT_VERSION),
  exportedAt: z.string(),
  tasks: z.array(TaskSchema),
  groups: z.array(GroupSchema),
  timer: TimerSettingsSchema,
  planner: PlannerStateSchema,
})

export type CurrentSnapshot = z.infer<typeof CurrentSnapshotSchema>
```

This makes the app-level wire contract visible in one place. It is more coupled than a registry, but the coupling is real: backup/restore is an app-level aggregate, and cross-field invariants are not plugin-local.

The current snapshot schema also owns aggregate id invariants that feature-local record schemas cannot express: task ids must be unique, group ids must be unique, and there cannot be multiple groups with the canonical default-group id. These checks run before normalization so imports with ambiguous aggregate identity are rejected instead of committed into stores whose actions key records by `id`.

Alternative considered: keep `Slice<T>` and improve its typing. Rejected for this redesign because it still makes a domain-specific app snapshot look plugin-like.

### Make supported versions explicit

`CURRENT_SNAPSHOT_VERSION` is not the same thing as the full set of supported import versions. `version.ts` should expose the current version and an explicit supported-version list. Migration code should switch over the detected version, handling legacy versions deliberately and returning current-version snapshots unchanged.

This keeps future version bumps honest: when current moves from v3 to v4, support for importing v3 must be added explicitly instead of being lost accidentally because only `2 | CURRENT_SNAPSHOT_VERSION` was accepted.

### Use staged modules with narrow responsibilities

Target module responsibilities:

```text
version.ts       current version constant and version detection only
schema.ts        current snapshot zod schema and inferred types only
parse.ts         JSON parsing and current snapshot parsing helpers only
migrations.ts    old-version-to-current conversion only
normalize.ts     current snapshot invariant repair only
build.ts         current stores -> current snapshot only
apply.ts         current snapshot -> stores only
import.ts        prepare/commit orchestration only
index.ts         public exports only
```

The names can be adjusted during implementation, but the responsibility boundaries should remain.

Alternative considered: one `validate.ts` and one `apply.ts` with more helpers. Rejected because the user's concern is specifically SRP and hidden side effects in broad functions.

### Split import into prepare and commit

Expose an orchestration API that supports confirmation flows without mixing preparation and mutation:

```ts
prepareSnapshotImport(json: string): PreparedSnapshotImportResult
commitSnapshotImport(snapshot: PreparedSnapshot): ApplyResult
```

`prepareSnapshotImport` does parse JSON, migrate, parse current snapshot, normalize, and return a `PreparedSnapshot` plus warnings. It does not mutate stores. `commitSnapshotImport` mutates stores only and accepts `PreparedSnapshot`, not raw `CurrentSnapshot`, so callers cannot accidentally bypass normalization.

The file import flow should select the file, prepare the snapshot, show the confirmation dialog with any preparation warnings, and commit only after confirmation. Google Drive restore should keep its existing behavior where cancel performs no download: confirm first, then download, prepare, and commit if preparation succeeds.

Alternative considered: keep `validateSnapshot` and `applySnapshot` names or temporary compatibility wrappers. Rejected because wrappers keep the old ambiguous mental model alive and make it unclear whether normalization has happened.

### Make current restore all-or-nothing

After migration and normalization, the current snapshot must validate as a whole before any store is mutated. Invalid current snapshot payloads reject the import instead of partially applying independent fields.

This fits backup/restore expectations better than best-effort salvage. If a future product need emerges for partial recovery, it should be a separate explicit mode with UI copy that explains the risk.

Alternative considered: preserve per-slice warnings and partial apply. Rejected because it can produce half-restored state and makes cross-slice dependencies hard to reason about.

### Normalize before final apply

Dangling `task.groupId` remains repairable, but the repair belongs in `normalize.ts`, not `apply.ts`. The normalization step accepts a typed current snapshot and returns a `PreparedSnapshot` plus warnings. Store mutation receives the prepared snapshot only.

The prepared snapshot must preserve group-reference integrity. If imported groups do not include `DEFAULT_GROUP_ID`, normalization adds a valid default group and returns a warning. For dangling task references, repaired task `groupId` values point to `DEFAULT_GROUP_ID`, which is guaranteed to exist in the prepared snapshot.

Alternative considered: make dangling references a hard validation error. Rejected because the current product behavior intentionally repairs this case, and keeping the repair is compatible with all-or-nothing restore after normalization.

### Retire the registry from the core path

The implementation may remove `src/shared/utils/slice.ts` and feature `slice.ts` files if they become unused. If another active change still needs them temporarily, they can remain as compatibility scaffolding, but they should not be the primary data-portability model.

Future persisted domains, such as routines, will update the explicit aggregate schema, build/apply functions, migrations, and normalization rules where needed.

## Risks / Trade-offs

- More explicit imports in data-portability → Acceptable because data-portability is the documented cross-cutting app snapshot boundary.
- All-or-nothing import rejects files that previously partially restored → Mitigate with clear error handling and tests; backup/restore safety is more important than silent partial state.
- Active `add-daily-routines` change overlaps with snapshot files → Land this redesign first or rebase routines to add `routines` to the explicit aggregate pipeline.
- Compatibility with existing callers requires API updates → Move callers to prepare/commit directly; do not keep old wrapper names unless an external consumer is discovered.
- Removing slices may affect architecture docs or tests → Update the `data-portability` spec and any barrel exports/tests that assumed `slices` is public.
- `downloadAsFile` re-export can blur ownership → Keep the browser download helper in `src/shared/utils/download`; data-portability exposes snapshot operations only.

## Migration Plan

1. Add characterization tests for existing successful v3 import, v2 migration, theme exclusion, malformed JSON rejection, and dangling group repair.
2. Add tests for new all-or-nothing behavior: invalid current snapshot fields reject without mutating stores.
3. Introduce the current snapshot schema/type and SRP modules alongside existing functions.
4. Move consumers from `validateSnapshot`/`applySnapshot` to prepare/commit directly.
5. Remove the registry-driven apply path and obsolete slice exports once consumers/tests no longer need them.
6. Run format, typecheck, lint, and tests.

Rollback is a source-only revert. The exported snapshot wire format remains version-compatible, so no localStorage or backup-file cleanup is required.

## Open Questions

- Should `exportedAt` remain `z.string()` or become an ISO datetime refinement as part of the current snapshot schema? This redesign does not require changing it.
