## Why

The current `architecture` spec restricts cross-feature imports to a small app-level allowlist (`src/app/bootstrap.ts`, `src/app/App.tsx`, `src/app/shell/`). In practice, aggregate features such as `data-portability` and `google-drive` need to read from and write to several other feature stores. Today they can only do this by being treated as exceptions or by being placed under `src/app/`, which is not their natural home. The architecture spec also implies that only `src/app/` may import feature _schemas_ for validation, which forces the aggregate features to either violate the rule or to copy schemas into a shared location.

## What Changes

- Replace the "Cross-cutting imports are exceptional" allowlist with a positive rule: any file under `src/features/<domain>/` MAY import from other features via their public barrels (`@/features/<other>`) and from `src/shared/`. A file SHALL NOT import a sibling feature's internals (e.g. `@/features/<other>/store` or `@/features/<other>/schema`).
- Remove the corresponding statements in the "Dependency direction is layered" requirement that imply cross-feature imports are exceptional. Re-align the layered rule so that `src/features/` is the middle layer and can reach other features only through barrels.
- Keep the intra-feature relative-path rule unchanged: a feature SHALL NOT import itself via its own barrel, and SHALL NOT reach into a sibling file inside the same feature through the barrel path.
- Keep the "store actions are reached via the foreign barrel" invariant. Calls into a foreign store still go through that feature's public actions (reached via the barrel) rather than mutating foreign state from inside a foreign component.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `architecture`: Replace the "Cross-cutting imports are exceptional" allowlist with a barrel-only cross-feature import rule, and update the layered-dependency requirement to match.

## Impact

- Affected specs: `openspec/specs/architecture/spec.md` — the "Cross-cutting imports are exceptional" requirement and the "Dependency direction is layered" requirement are rewritten; supporting scenarios are updated.
- Affected code: none directly. `src/features/data-portability/*` and `src/features/google-drive/store.ts` already import across features via barrels and become spec-compliant under the new rule.
- Dependencies: no new runtime dependency expected.
