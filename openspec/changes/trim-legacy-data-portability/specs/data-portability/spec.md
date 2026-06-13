## MODIFIED Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting save/restore orchestration in a dedicated `data-portability` feature at `src/features/data-portability/`. The data-portability feature SHALL own:

- The current save envelope schema, currently `envelopeVersion: 1`.
- JSON parsing and current envelope parsing helpers.
- The slice registry that imports each participating feature's save slice and exports the canonical ordered list.
- The shared `SaveSlice`, `SaveSlicePrepareResult`, and `MissingSliceStrategy<TCurrent>` types.
- The `buildSnapshot` function that assembles the current envelope by calling each registered slice's `exportSlice`.
- The preparation function that parses a current envelope, prepares every slice through its `prepareImport` function, and normalizes cross-slice invariants without mutating stores.
- The commit function that writes a prepared snapshot by calling each slice's `applyImport` in registry order.

Feature-owned slice schemas, entity schemas, and slice migrations SHALL live in the owning feature. The data-portability feature SHALL NOT own task, group, timer-settings, or planner entity migrations.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features and from `src/shared/*` because it is the explicit cross-cutting app snapshot boundary.

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The pipeline has separated slice-owned stages

- **WHEN** data-portability prepares an import
- **THEN** JSON parsing, current envelope parsing, per-slice import preparation, cross-slice normalization, and commit are implemented as separate stages with narrow responsibilities
- **AND** store mutation happens only in the commit stage
- **AND** each feature-owned slice handles its own version detection, historical schema parsing, and slice migrations inside `prepareImport`

#### Scenario: The envelope schema defines the current nested shape

- **WHEN** data-portability parses a current save envelope
- **THEN** the schema requires `envelopeVersion: literal(1)`, `exportedAt: string`, and `slices: object`
- **AND** the schema does not validate feature entity payloads directly because feature-owned slices validate their own fields during `prepareImport`
- **AND** the schema does NOT require a `theme` field because theme is intentionally excluded from the save snapshot
- **AND** the schema does NOT require top-level `version`, `tasks`, `groups`, `timer`, `timerSettings`, or `planner` fields

#### Scenario: The registry imports each participating feature's save slice

- **WHEN** the data-portability feature is initialised
- **THEN** its registry imports save slices from `@/features/groups`, `@/features/tasks`, `@/features/timer`, and `@/features/planner`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry

### Requirement: Supported snapshot versions are explicit

The system SHALL support the current nested save envelope only. Current nested envelopes use `envelopeVersion`. Flat app-level snapshots with top-level `version: 2` or `version: 3` SHALL be rejected before store mutation, the same as unsupported envelope versions or unrecognized files.

#### Scenario: Current envelope is accepted

- **WHEN** `prepareSnapshotImport` receives a valid nested save envelope with `envelopeVersion: 1`
- **THEN** data-portability parses the current envelope shape
- **AND** passes the envelope's slice payloads through the registered slice `prepareImport` path

#### Scenario: Legacy flat versions are rejected

- **WHEN** `prepareSnapshotImport` receives a flat legacy snapshot with top-level `version: 2` or `version: 3`
- **THEN** preparation returns `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no slice preparation or store mutation occurs

#### Scenario: Unsupported version is rejected before parsing current payload

- **WHEN** `prepareSnapshotImport` receives a snapshot with an unsupported `envelopeVersion` or an unrecognized version shape
- **THEN** preparation returns `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no slice preparation or store mutation occurs

### Requirement: Snapshot import is prepared before commit

The system SHALL split snapshot import into a preparation phase and a commit phase. Preparation SHALL parse JSON, parse the current envelope, prepare every registered slice, normalize repairable cross-slice domain invariants, and return a `PreparedSnapshot` plus warnings. Preparation SHALL NOT mutate feature stores. Commit SHALL accept a `PreparedSnapshot` and apply every slice in registry order. `PreparedSnapshot` SHALL be a distinct TypeScript type from the parsed envelope so callers cannot accidentally commit data that has not passed through slice preparation and cross-slice normalization.

#### Scenario: Preparing a valid import does not mutate stores

- **WHEN** `prepareSnapshotImport` receives a valid import JSON string
- **THEN** it returns `{ ok: true, snapshot: <prepared snapshot> }` with optional warnings
- **AND** no feature store is modified before `commitSnapshotImport` is called

#### Scenario: Committing a prepared import mutates stores

- **WHEN** `commitSnapshotImport` receives a `PreparedSnapshot`
- **THEN** it calls each registered slice's `applyImport` in canonical registry order
- **AND** it does not parse JSON, run slice migrations, or perform normalization

#### Scenario: Unprepared snapshots cannot be committed directly

- **WHEN** application code has a current envelope value returned by the envelope parser
- **THEN** TypeScript does not allow that value to be passed directly to `commitSnapshotImport`
- **AND** the value must first pass through slice preparation and cross-slice normalization to become a `PreparedSnapshot`

#### Scenario: Invalid current payload rejects whole import

- **WHEN** a save envelope has a valid envelope shape but one registered slice fails `prepareImport`
- **THEN** `prepareSnapshotImport` returns `{ ok: false, reason: <message> }`
- **AND** `commitSnapshotImport` is not called
- **AND** no feature store is modified

*** Add File: /home/geril/code/my/daybox/openspec/changes/trim-legacy-data-portability/specs/data-persistence/spec.md
## MODIFIED Requirements

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported current-envelope JSON file to restore save snapshot data into the owning stores. The import MUST accept the current nested envelope with `envelopeVersion: 1`, `exportedAt`, and `slices`. Import preparation SHALL parse the envelope, prepare every registered feature slice, normalize cross-slice invariants without mutating stores, and commit only after preparation succeeds and the user confirms replacement. Flat legacy JSON files with top-level `version: 2` or `version: 3` SHALL be rejected.

#### Scenario: Import current data

- **WHEN** user selects a current-envelope JSON file via the "Import" button in settings
- **THEN** the file is prepared through data-portability without mutating stores
- **AND** after the user confirms replacement, tasks, groups, timer settings, and planner preferences are replaced with the prepared snapshot data
- **AND** theme is left unchanged

#### Scenario: Import flat legacy data is rejected

- **WHEN** user selects a flat `version: 2` or `version: 3` JSON file via the "Import" button in settings
- **THEN** preparation fails with `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no confirmation dialog is shown for committing that file
- **AND** no store state is modified

#### Scenario: Import confirms before committing

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

#### Scenario: Import cancellation preserves local data

- **WHEN** user selects a JSON file that prepares successfully and then cancels the confirmation dialog
- **THEN** no store state is modified

### Requirement: Import applies a per-layer validation policy

The system SHALL prepare imported snapshot JSON through the data-portability pipeline. Envelope failures and current slice payload failures SHALL reject the whole import. Repairable cross-reference failures SHALL be normalized before commit and returned as warnings. Prepared imports SHALL be committed all-or-nothing; the app SHALL NOT partially apply valid snapshot sections when another current snapshot section is invalid.

#### Scenario: Current import with a malformed task is rejected

- **WHEN** a user imports a current snapshot containing 10 valid tasks and 1 task missing its `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with duplicate ids is rejected

- **WHEN** a user imports a current snapshot whose tasks or groups contain duplicate `id` values
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with a dangling groupId is normalized

- **WHEN** a user imports a current snapshot where task T points at group G that does not exist
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** task T is prepared with `groupId: DEFAULT_GROUP_ID`
- **AND** `warnings` notes the dangling reference
- **AND** no store state is modified until the prepared snapshot is committed

#### Scenario: Current import missing default group is normalized

- **WHEN** a user imports a current snapshot whose groups do not include the canonical default group
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** the prepared snapshot includes a valid default group
- **AND** `warnings` notes that the default group was restored

#### Scenario: Envelope failure rejects the import

- **WHEN** a user imports a JSON file missing current `envelopeVersion: 1`
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no store state is modified
