## 1. Characterization And Contract Tests

- [x] 1.1 Add tests proving `buildSnapshot` returns the current version, `exportedAt`, tasks, groups, timer, planner, and no theme field.
- [x] 1.2 Add tests proving v2 JSON can be prepared into a current snapshot with timer and planner fields migrated and theme dropped.
- [x] 1.3 Add tests proving malformed JSON, unsupported versions, missing current fields, and invalid current feature payloads reject preparation without mutating stores.
- [x] 1.4 Add tests proving dangling task `groupId` values are repaired during preparation, warnings are returned, and stores are not mutated until commit.
- [x] 1.5 Add tests proving a snapshot missing the canonical default group is prepared with a restored default group and a warning.
- [x] 1.6 Add tests proving commit writes a `PreparedSnapshot` to all owning stores.

## 2. Current Snapshot Model

- [x] 2.1 Create or refactor the version module so the current snapshot version constant and supported-version detection are isolated from migration and validation.
- [x] 2.2 Create the current snapshot schema by composing `TaskSchema`, `GroupSchema`, `TimerSettingsSchema`, and `PlannerStateSchema`.
- [x] 2.3 Export the `CurrentSnapshot` type inferred from the current snapshot schema.
- [x] 2.4 Add a distinct `PreparedSnapshot` type that cannot be passed as a plain unnormalized `CurrentSnapshot` without going through normalization.
- [x] 2.5 Update the current envelope/schema tests to assert full payload validation instead of only `z.unknown()` field presence.

## 3. SRP Import Pipeline

- [x] 3.1 Add a JSON parse helper that only parses JSON and returns a typed success/failure result.
- [x] 3.2 Refactor migrations so migration functions only convert supported old raw shapes into current raw snapshot candidates.
- [x] 3.3 Add a current snapshot parser that only runs the current snapshot schema and returns a typed current snapshot or failure reason.
- [x] 3.4 Add a normalization function that accepts a `CurrentSnapshot`, restores the default group if missing, repairs dangling task group references, and returns a `PreparedSnapshot` plus warnings without mutating stores.
- [x] 3.5 Add `prepareSnapshotImport(json)` to orchestrate parse, version detection, migration, current parsing, and normalization without store mutation.
- [x] 3.6 Add `commitSnapshotImport(snapshot)` to write a `PreparedSnapshot` to tasks, groups, timer, and planner stores only.

## 4. Build And Consumer Wiring

- [x] 4.1 Refactor `buildSnapshot` to explicitly build and return `CurrentSnapshot` from feature stores, without relying on the slice registry.
- [x] 4.2 Update `SettingsDrawer` so file import selects a file, prepares it without mutation, shows confirmation with warnings when preparation succeeds, and commits only after confirmation.
- [x] 4.3 Update `google-drive` restore so confirmation still happens before download, then download prepares and commits through data-portability with warning propagation.
- [x] 4.4 Remove `validateSnapshot` and `applySnapshot` from the public data-portability barrel once consumers use prepare/commit.

## 5. Registry And Slice Cleanup

- [x] 5.1 Remove the registry-driven apply path from data-portability once consumers use the explicit pipeline.
- [x] 5.2 Remove `slices` from the data-portability public barrel unless tests/tooling still have a concrete need for it.
- [x] 5.3 Remove or stop exporting feature `slice.ts` files and `src/shared/utils/slice.ts` if no remaining code path uses them.
- [x] 5.4 Update or remove tests that asserted registry order or partial per-slice salvage behavior.
- [x] 5.5 Audit implementation-facing docs and tests so no remaining source expectation requires partial import, theme import, or old validate/apply API names.

## 6. Verification And Coordination

- [x] 6.1 Run `npm run format`.
- [x] 6.2 Run `npm run typecheck`.
- [x] 6.3 Run `npm run lint`.
- [x] 6.4 Run `npm run test`.
- [x] 6.5 Review the active `add-daily-routines` change and note that routines should be added to the explicit current snapshot schema, build, commit, migrations, and normalization rules after this redesign lands.

## 7. Post-Review Readiness Hardening

- [x] 7.1 Remove the superseded `harden-data-portability-pipeline` change so active OpenSpec contracts do not conflict.
- [x] 7.2 Remove `downloadAsFile` from the data-portability public contract and document direct imports from `@/shared/utils/download`.
- [x] 7.3 Make supported snapshot versions explicit and route migration through an exhaustive version switch.
- [x] 7.4 Validate aggregate snapshot identity invariants: unique task ids, unique group ids, and no duplicate default group.
- [x] 7.5 Add regression tests for supported version detection and duplicate-id rejection without store mutation.
- [x] 7.6 Re-run format, typecheck, lint, and tests.
