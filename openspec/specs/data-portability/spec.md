## Purpose

Define the cross-cutting save/restore mechanics that DayBox uses for file export/import and Google Drive backup/restore: the nested save envelope, feature-owned save slices, legacy flat snapshot adapters, all-or-nothing prepare/commit pipeline, and cross-slice normalization. Behavioural rules for individual features live in their own capability files; this capability governs the wire format and orchestrator.

## Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting save/restore orchestration in a dedicated `data-portability` feature at `src/modules/data-portability/`. The data-portability feature SHALL own:

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
- **THEN** its registry imports save slices from `@/modules/groups`, `@/modules/tasks`, `@/modules/timer`, and `@/modules/planner`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state needed for the app-level save snapshot by calling every registered slice's `exportSlice`. The returned object SHALL be a plain JavaScript object, not a string; callers are responsible for serialising it. File Export, file Import, Google Drive Backup, and Google Drive Restore SHALL all use this same canonical snapshot contract.

#### Scenario: Building a snapshot includes every registered slice

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `envelopeVersion: 1` and `exportedAt: <current ISO string>`
- **AND** it has a `slices` object
- **AND** for each slice in the registry, the slice's `exportSlice()` is called and the result is stored under the slice's `name`
- **AND** the order of fields in `slices` follows the order of slices in the registry

#### Scenario: Building a snapshot includes timer settings only

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object's `slices.timerSettings` field is populated from the timer store's settings
- **AND** the returned object does not include a top-level `timer` field
- **AND** the returned object does not include timer runtime fields such as `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, or `sessionPomoCount`

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

### Requirement: Current snapshot composes feature-owned save slices

The system SHALL define the current save envelope in data-portability while individual feature slices define and validate their own current slice payloads. Data-portability SHALL compose registered feature slices during build, prepare, and commit. Individual features SHALL own their local save schemas and types.

#### Scenario: Current snapshot validates full payloads through slices

- **WHEN** a current save envelope contains invalid task, group, timer settings, or planner slice data
- **THEN** the relevant slice's `prepareImport` fails
- **AND** the whole import preparation fails
- **AND** the import is not eligible to be committed to stores

#### Scenario: Feature save schemas remain source of truth for slice payloads

- **WHEN** data-portability prepares a current save envelope
- **THEN** it passes each raw slice payload to that feature's `prepareImport`
- **AND** it does not duplicate task, group, timer-settings, or planner shape definitions by hand

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

### Requirement: Snapshot normalization repairs known invariants before commit

The system SHALL normalize repairable cross-slice domain invariants after all slices prepare successfully and before commit. Normalization SHALL accept prepared current slice values and return a `PreparedSnapshot`; it MAY return warnings describing repairs. The current repairable invariants are group fallback safety and task-to-group references: the prepared groups slice SHALL include the canonical default group, and every prepared task's `groupId` SHALL reference a group in the prepared groups slice. Dangling task group ids are replaced with the canonical default group id.

The normalizer SHOULD be named to reflect this ownership boundary, for example `normalizeCrossSliceInvariants`, because feature-owned `prepareImport` functions own slice-local shape validation and migrations while data-portability owns relationships between prepared slices.

#### Scenario: Duplicate task ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with two tasks that share the same `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate group ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with two groups that share the same `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate default groups reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current save envelope with more than one group whose `id` is the canonical default-group id
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** normalization does not attempt to choose between the duplicate defaults

#### Scenario: Dangling task group is repaired during preparation

- **WHEN** `prepareSnapshotImport` receives a save snapshot with valid tasks and groups, but a task references a missing group id
- **THEN** preparation returns an ok result whose snapshot has that task's `groupId` set to the canonical default group id
- **AND** the result includes a warning naming the dangling group id
- **AND** no store is modified until the prepared snapshot is committed

#### Scenario: Missing default group is repaired during preparation

- **WHEN** `prepareSnapshotImport` receives a save snapshot whose groups do not include the canonical default group id
- **THEN** preparation returns an ok result whose snapshot includes a valid default group
- **AND** tasks that need fallback reassignment can point at an existing default group
- **AND** the result includes a warning that the default group was restored

#### Scenario: Normalization is not a store mutation step

- **WHEN** normalization repairs a current snapshot
- **THEN** it returns a prepared snapshot value
- **AND** it does not call any feature store setter or action

### Requirement: Feature save slices own their versions and migrations

The system SHALL represent each save-participating feature as a save slice. A save slice SHALL declare its name, current version, missing-slice strategy, export function, import preparation function, and import apply function. Feature-owned slice schemas and migrations SHALL live in the owning feature.

#### Scenario: A feature exports a save slice

- **WHEN** a feature participates in save/restore
- **THEN** its barrel exports a save slice with `name`, `currentVersion`, `missing`, `exportSlice`, `prepareImport`, and `applyImport`
- **AND** `exportSlice` returns the feature's current save slice payload including a slice-level `version`
- **AND** `prepareImport` accepts `unknown`, parses the incoming slice version, runs feature-owned migrations as needed, and returns the current slice payload
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

### Requirement: Save transports share the same snapshot contract

The system SHALL treat file Export, file Import, Google Drive Backup, and Google Drive Restore as transports for the same canonical save snapshot. Google Drive SHALL NOT define a separate snapshot profile or omit fields that file export includes.

#### Scenario: File export and Google Drive backup serialize the same shape

- **WHEN** file Export and Google Drive Backup each call `buildSnapshot`
- **THEN** both serialise the same current envelope shape
- **AND** both include `slices.timerSettings`
- **AND** neither includes timer runtime state or theme

#### Scenario: File import and Google Drive restore use the same prepare and commit path

- **WHEN** file Import or Google Drive Restore receives snapshot JSON
- **THEN** the JSON is passed through the same data-portability preparation pipeline
- **AND** a successful prepared snapshot is committed through the same commit function
- **AND** preparation warnings are surfaced by the caller without changing the underlying save semantics
