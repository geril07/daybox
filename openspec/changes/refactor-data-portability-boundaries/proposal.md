## Why

The data-portability module currently mixes snapshot envelope orchestration with generic save-slice contracts and group-domain repair logic. This makes feature save adapters depend on an aggregate module and gives data-portability ownership of behavior that belongs to the participating features.

## What Changes

- Move the generic save-slice contract (`SaveSlice`, `SaveSlicePrepareResult`, and `MissingSliceStrategy`) from `src/modules/data-portability` to a shared save-slice utility module.
- Update feature save adapters to depend on the shared save-slice contract instead of importing data-portability internals.
- Move slice-local default repair and validation to the owning feature save slices where practical, including default-group restoration in the groups save path.
- Keep data-portability responsible for the save envelope, registry, snapshot build, import preparation orchestration, commit orchestration, and true cross-slice normalization.
- Remove or consolidate duplicate/unused parsing helpers and misleading schema names that imply full payload validation where only the envelope is validated.
- Update specs so the documented ownership model matches the code.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-portability`: Narrow ownership from generic slice contracts plus domain repairs to envelope versioning, registry, and save/restore orchestration.
- `shared-layer`: Allow a domain-agnostic shared save-slice contract module while preserving the rule that shared contains no domain-owned types or constants.

## Impact

- Affected source areas: `src/modules/data-portability/`, feature `save/slice.ts` adapters, and a new `src/shared/save-slice/` utility module.
- Public module API impact: feature save adapters import save-slice types from `@/shared/save-slice`; data-portability stops exporting generic save-slice contracts as part of its public API.
- Behavioral impact: save/export/import behavior should remain unchanged for users; this is an ownership and boundary refactor.
- Spec impact: update data-portability and shared-layer requirements to reflect the new dependency direction and responsibility split.
