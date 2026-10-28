# Spec Delta

## MODIFIED Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting save/restore orchestration in a dedicated `data-portability` feature at `src/modules/data-portability/`. The data-portability feature SHALL own:

- The current save envelope schema, currently `envelopeVersion: 1`.
- JSON parsing and current envelope parsing helpers that return standardized `PrepareResult` types with structured zod error messages and validate slice keys against registered slice names.
- The slice registry that imports each participating feature's save slice, exports the canonical ordered list, and augments the `SaveSliceMap` interface via `declare module` so that slice `postPrepare` callbacks receive fully-typed `allSlices`.
- The `buildSnapshot` function that assembles the current envelope by calling each registered slice's `exportSlice` and optional `validateExport`.
- The preparation function that parses a current envelope, walks each slice's `migrateFrom` chain, calls `prepareImport`, and calls each slice's optional `postPrepare` (providing the full prepared slice map) — all without mutating stores.
- The commit function that writes a prepared snapshot by calling each slice's `applyImport` in registry order, wrapped in try/catch with partial-commit reporting on failure.
- The migration chain runner (`prepareSlice`) that detects the slice-level `version` in input data and chains `migrateFrom` entries until the data reaches `currentVersion`.

Feature-owned slice schemas, entity schemas, slice-local migration functions, postPrepare logic, and validateExport logic SHALL live in the owning feature. The data-portability feature SHALL NOT own task, group, timer-settings, or planner entity migrations, postPrepare repair logic, or export validation rules.

The centralized `normalizeCrossSliceInvariants` function is removed. Cross-slice invariant repair moves into each dependent slice's `postPrepare` hook.

The shared, domain-agnostic save-slice contracts (`SaveSlice`, `PrepareResult`, `MissingSliceStrategy`, `SliceMigration`, and the `SaveSliceMap` interface) SHALL live outside data-portability in `src/shared/save-slice/`. Feature-owned slice schemas, entity schemas, slice-local defaults, slice-local validation, migration functions, postPrepare logic, and validateExport logic SHALL live in the owning feature. The data-portability feature SHALL NOT own task, group, timer-settings, or planner entity migrations or slice-local fallback construction.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features and from `src/shared/*` because it is the explicit cross-cutting app snapshot boundary.

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The pipeline has separated slice-owned stages

- **WHEN** data-portability prepares an import
- **THEN** JSON parsing, current envelope parsing, migration chain walking, per-slice import preparation, per-slice postPrepare, and commit are implemented as separate stages with narrow responsibilities
- **AND** store mutation happens only in the commit stage
- **AND** each feature-owned slice handles its own version detection through the migration chain, plus slice-local defaulting, slice-local validation, and slice-local cross-reference repair inside `prepareImport` and `postPrepare`

#### Scenario: The envelope schema defines the current nested shape

- **WHEN** data-portability parses a current save envelope
- **THEN** the schema requires `envelopeVersion: literal(1)`, `exportedAt: string`, and `slices: object`
- **AND** the schema does not validate feature entity payloads directly because feature-owned slices validate their own fields during `prepareImport`
- **AND** the schema does NOT require a `theme` field because theme is intentionally excluded from the save snapshot
- **AND** the schema does NOT require top-level `version`, `tasks`, `groups`, `timer`, `timerSettings`, or `planner` fields

#### Scenario: Envelope parsing reports structured zod errors

- **WHEN** `parseSaveEnvelope` receives an object that fails `SaveEnvelopeSchema` validation
- **THEN** the error reason includes the specific field path and expected value (e.g., `"envelope.envelopeVersion: Expected 1, received 2"` or `"envelope.slices: Expected object, received string"`)
- **AND** the reason is NOT the opaque string `"Not a DayBox export file."`

#### Scenario: Envelope parsing rejects unknown slice keys

- **WHEN** `parseSaveEnvelope` receives a valid envelope whose `slices` object contains a key that does not match any registered slice name
- **THEN** parsing fails with `{ ok: false, reason: "envelope.slices.<key>: Unknown slice — not a registered feature" }`
- **AND** no further slice preparation occurs

#### Scenario: The registry imports each participating feature's save slice

- **WHEN** the data-portability feature is initialised
- **THEN** its registry imports save slices from `@/modules/groups`, `@/modules/tasks`, `@/modules/timer`, `@/modules/planner`, and `@/modules/history`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner, history
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry
- **AND** the registry augments the `SaveSliceMap` interface with the concrete slice type for each registered slice name so that `postPrepare` receives a typed `allSlices` parameter

#### Scenario: Feature save adapters depend on the shared contract

- **WHEN** a feature-owned save adapter declares its save slice
- **THEN** it imports `SaveSlice`, `PrepareResult`, and related generic save-slice types from `@/shared/save-slice`
- **AND** it does NOT import those generic contracts from `@/modules/data-portability` or `@/modules/data-portability/types`

## ADDED Requirements

### Requirement: The history save slice carries the activity event list

The `history` save slice SHALL export the full activity event list at slice version `1`. Import preparation SHALL validate every event against the activity-history event schema and SHALL fail on duplicate event ids. A current envelope without a `history` slice SHALL prepare to an empty event list. Commit SHALL replace the local event list with the prepared list.

#### Scenario: History round-trips through export and import

- **WHEN** user exports a snapshot that contains activity events and imports it in another browser
- **THEN** the imported history contains the same events in the same order

#### Scenario: Invalid history event fails preparation

- **WHEN** a snapshot's `history` slice contains an event with an unknown `type`
- **THEN** import preparation fails with a reason that names the `history` slice
- **AND** no store is modified

#### Scenario: Duplicate history event id fails preparation

- **WHEN** a snapshot's `history` slice contains two events with the same `id`
- **THEN** import preparation fails

#### Scenario: Missing history slice prepares as empty

- **WHEN** a current envelope has no `history` slice
- **THEN** preparation succeeds with an empty history event list
