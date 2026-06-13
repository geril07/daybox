## MODIFIED Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting save/restore orchestration in a dedicated `data-portability` feature at `src/modules/data-portability/`. The data-portability feature SHALL own:

- The current save envelope schema, currently `envelopeVersion: 1`.
- JSON parsing and current envelope parsing helpers.
- The slice registry that imports each participating feature's save slice and exports the canonical ordered list.
- The `buildSnapshot` function that assembles the current envelope by calling each registered slice's `exportSlice`.
- The preparation function that parses a current envelope, prepares every slice through its `prepareImport` function, and normalizes cross-slice invariants without mutating stores.
- The commit function that writes a prepared snapshot by calling each slice's `applyImport` in registry order.

The shared, domain-agnostic save-slice contracts (`SaveSlice`, `SaveSlicePrepareResult`, and `MissingSliceStrategy<TCurrent>`) SHALL live outside data-portability in `src/shared/save-slice/`. Feature-owned slice schemas, entity schemas, slice-local defaults, slice-local validation, and slice migrations SHALL live in the owning feature. The data-portability feature SHALL NOT own task, group, timer-settings, or planner entity migrations or slice-local fallback construction.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features and from `src/shared/*` because it is the explicit cross-cutting app snapshot boundary.

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The pipeline has separated slice-owned stages

- **WHEN** data-portability prepares an import
- **THEN** JSON parsing, current envelope parsing, per-slice import preparation, cross-slice normalization, and commit are implemented as separate stages with narrow responsibilities
- **AND** store mutation happens only in the commit stage
- **AND** each feature-owned slice handles its own version detection, historical schema parsing, slice-local defaulting, slice-local validation, and slice migrations inside `prepareImport`

#### Scenario: The envelope schema defines the current nested shape

- **WHEN** data-portability parses a current save envelope
- **THEN** the schema requires `envelopeVersion: literal(1)`, `exportedAt: string`, and `slices: object`
- **AND** the schema does not validate feature entity payloads directly because feature-owned slices validate their own fields during `prepareImport`
- **AND** the schema does NOT require a `theme` field because theme is intentionally excluded from the save snapshot
- **AND** the schema does NOT require top-level `version`, `tasks`, `groups`, `timer`, `timerSettings`, or `planner` fields

#### Scenario: The registry imports each participating feature's save slice

- **WHEN** the data-portability feature is initialised
- **THEN** its registry imports save slices from `@/modules/groups`, `@/modules/tasks`, `@/modules/timer`, and `@/modules/planner`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry

#### Scenario: Feature save adapters depend on the shared contract

- **WHEN** a feature-owned save adapter declares its save slice
- **THEN** it imports `SaveSlice` and related generic save-slice types from `@/shared/save-slice`
- **AND** it does NOT import those generic contracts from `@/modules/data-portability` or `@/modules/data-portability/types`

### Requirement: Snapshot normalization repairs known invariants before commit

The system SHALL normalize repairable cross-slice domain invariants after all slices prepare successfully and before commit. Normalization SHALL accept prepared current slice values and return a `PreparedSnapshot`; it MAY return warnings describing repairs. The current cross-slice repairable invariant is task-to-group reference safety: every prepared task's `groupId` SHALL reference a group in the prepared groups slice. Dangling task group ids are replaced with the canonical default group id.

Feature-owned `prepareImport` functions SHALL own slice-local parsing, migrations, defaults, and validation before data-portability performs cross-slice normalization. In particular, the groups save slice SHALL ensure the prepared groups payload includes the canonical default group when that repair is possible, and the tasks and groups save slices SHALL reject duplicate ids in their own payloads.

The normalizer SHOULD be named to reflect this ownership boundary, for example `normalizeCrossSliceInvariants`, because feature-owned `prepareImport` functions own slice-local shape validation and migrations while data-portability owns relationships between prepared slices.

#### Scenario: Duplicate task ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with two tasks that share the same `id`
- **THEN** the tasks save slice rejects preparation with `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate group ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with two groups that share the same `id`
- **THEN** the groups save slice rejects preparation with `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate default groups reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with more than one group whose `id` is the canonical default-group id
- **THEN** the groups save slice rejects preparation with `{ ok: false, reason: <message> }`
- **AND** cross-slice normalization does not attempt to choose between the duplicate defaults

#### Scenario: Dangling task group is repaired during preparation

- **WHEN** `prepareSnapshotImport` receives a save snapshot with valid tasks and groups, but a task references a missing group id
- **THEN** preparation returns an ok result whose snapshot has that task's `groupId` set to the canonical default group id
- **AND** the result includes a warning naming the dangling group id
- **AND** no store is modified until the prepared snapshot is committed

#### Scenario: Missing default group is repaired by the groups slice during preparation

- **WHEN** `prepareSnapshotImport` receives a save snapshot whose groups do not include the canonical default group id
- **THEN** the groups save slice returns an ok prepared groups value that includes a valid default group
- **AND** data-portability cross-slice normalization can safely reassign dangling task group references to that default group
- **AND** the preparation result includes a warning that the default group was restored

#### Scenario: Normalization is not a store mutation step

- **WHEN** normalization repairs a current snapshot
- **THEN** it returns a prepared snapshot value
- **AND** it does not call any feature store setter or action

### Requirement: Feature save slices own their versions and migrations

The system SHALL represent each save-participating feature as a save slice. A save slice SHALL declare its name, current version, missing-slice strategy, export function, import preparation function, and import apply function using the generic save-slice contract from `@/shared/save-slice`. Feature-owned slice schemas, slice-local defaults, slice-local validation, and migrations SHALL live in the owning feature.

#### Scenario: A feature exports a save slice

- **WHEN** a feature participates in save/restore
- **THEN** its barrel exports a save slice with `name`, `currentVersion`, `missing`, `exportSlice`, `prepareImport`, and `applyImport`
- **AND** `exportSlice` returns the feature's current save slice payload including a slice-level `version`
- **AND** `prepareImport` accepts `unknown`, parses the incoming slice version, runs feature-owned migrations and slice-local repairs as needed, and returns the current slice payload
- **AND** `applyImport` writes a current slice payload to the feature's store

#### Scenario: Historical slice schemas are frozen compatibility contracts

- **WHEN** a feature defines a historical slice schema
- **THEN** the schema models the data that DayBox may have actually saved for that slice version
- **AND** the schema does not import a future/current feature schema that could make old save files fail before migration

#### Scenario: Current feature schemas alias latest versioned schemas

- **WHEN** a feature defines its current public schema (for example `TaskSchema`)
- **THEN** the schema entrypoint aliases the latest versioned feature schema (for example `TaskV1Schema`)
- **AND** save slice version schemas import the frozen versioned feature schema for their own version instead of copy-pasting entity shapes
- **AND** adding a future feature schema version updates the current alias without changing older save slice schemas

#### Scenario: Missing slice policy controls imports from older files

- **WHEN** a save envelope does not contain a registered slice
- **THEN** data-portability follows that slice's missing-slice strategy
- **AND** `{ kind: 'required' }` fails the import
- **AND** `{ kind: 'useDefault', getDefault }` calls `getDefault()` and prepares/applies that value
- **AND** there is no skip strategy; a registered slice either requires input or provides a default

#### Scenario: Save-slice contracts are not exported by data-portability

- **WHEN** code needs the generic save-slice contract types
- **THEN** it imports them from `@/shared/save-slice`
- **AND** it does not import or re-export those contracts through `@/modules/data-portability`
