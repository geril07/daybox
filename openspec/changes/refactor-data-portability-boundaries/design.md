## Context

`src/modules/data-portability/` currently owns the save envelope, registry, build/import pipeline, generic `SaveSlice` interface, central current snapshot typing, and cross-slice normalization. Participating features define their own save adapters, but those adapters import `SaveSlice` from `@/modules/data-portability/types`, which is a module-internal path and creates an unnecessary dependency from domain features back into an aggregate orchestrator.

The module also contains group-domain fallback construction in `normalize.ts`: it imports `DEFAULT_GROUP_ID`, `GROUP_COLORS`, and `Group`, then builds a missing "General" group. That keeps the current save pipeline safe, but the behavior is group-owned domain logic rather than envelope orchestration.

## Goals / Non-Goals

**Goals:**

- Make `data-portability` a thinner aggregate boundary for envelope versioning, slice registry, snapshot build, import preparation, and commit orchestration.
- Move generic, domain-agnostic save-slice contracts to `src/shared/save-slice/`.
- Keep feature-owned save semantics, defaults, validation, and migrations inside the owning feature save adapters.
- Preserve the current export/import/Google Drive backup behavior and warning semantics.
- Remove misleading or duplicate parser/schema surfaces where they do not represent full payload validation.

**Non-Goals:**

- No save envelope version bump.
- No change to the serialized snapshot shape.
- No new transport behavior for file import/export or Google Drive backup/restore.
- No broad rewrite of feature stores, persisted localStorage stores, or UI flows.

## Decisions

### Move SaveSlice contracts to shared

Create `src/shared/save-slice/` with a barrel and implementation file exporting:

- `SaveSlicePrepareResult<TCurrent>`
- `MissingSliceStrategy<TCurrent>`
- `SaveSlice<Name, TCurrent>`

Feature save adapters import these from `@/shared/save-slice`. `data-portability` imports the same contract for registry typing.

Alternative considered: export these types only from `@/modules/data-portability`. That keeps files fewer, but it preserves the wrong dependency direction and makes domain features depend on the aggregate save orchestrator.

### Keep domain defaults with the owning feature

Move missing-default-group repair into the groups save preparation path, using group-owned constants and types locally. `data-portability` should not construct groups directly.

Alternative considered: move a `createDefaultGroup` helper to shared. That would violate the shared-layer rule because the helper would contain group-domain constants and shape knowledge.

### Keep true cross-slice repair in data-portability

Keep task-to-group reference repair in data-portability because it depends on prepared task and group slices together. The normalizer should assume each slice has already completed slice-local parsing, migrations, and fallback restoration.

Alternative considered: make tasks repair group references during `tasksSaveSlice.prepareImport`. That would require tasks to know the prepared groups slice, coupling feature adapters to registry order and other slices.

### Reduce central snapshot typing coupling

Avoid importing feature version internals from `src/modules/data-portability/schema.ts`. Prefer deriving the current snapshot type from the registry where practical, or using feature-barrel exports if explicit current slice types remain necessary.

Alternative considered: keep direct imports from `@/modules/<feature>/save/versions/v1`. That is easy but bypasses feature barrels and makes data-portability depend on private version-file layout.

### Keep the public data-portability API focused

The data-portability barrel should expose snapshot build, prepare, commit, envelope schema/parsing, and snapshot result types needed by app and transport callers. It should stop exposing generic save-slice contracts once those live in shared.

Alternative considered: re-export shared save-slice contracts from data-portability for compatibility. There is no known external consumer; keeping the re-export would blur the boundary the refactor is meant to clarify.

## Risks / Trade-offs

- Type derivation from the registry may become complex → Prefer the smallest readable type change; if derivation obscures intent, expose current slice types through feature barrels instead.
- Moving duplicate-id validation into feature slices can change error path strings → Preserve existing user-facing error wording where tests assert it.
- Moving default-group repair earlier may change warning order → Preserve the current warning messages and avoid relying on order unless existing tests require it.
- Removing data-portability type exports can break hidden imports → Search the repo for all `data-portability/types` and `SaveSlice` imports before removing exports.
- Shared save-slice utilities could become a dumping ground → Keep the shared module limited to domain-agnostic contracts only.

## Migration Plan

1. Add `src/shared/save-slice/` and move generic contracts there.
2. Update feature save adapters and data-portability registry imports to use `@/shared/save-slice`.
3. Move group-local fallback restoration and duplicate group validation into the groups save adapter.
4. Move duplicate task validation into the tasks save adapter.
5. Narrow data-portability normalization to cross-slice task-group repair.
6. Remove duplicate/unused parse helpers and adjust schema/type names if they overstate validation scope.
7. Update tests to preserve existing import behavior and verify the new ownership boundaries.
8. Run format, typecheck, lint, and tests.
