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

Feature-owned slice schemas, entity schemas, and slice migrations SHALL live in the owning feature. The data-portability feature SHALL NOT own task, group, timer-settings, planner, or routines entity migrations.

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
- **AND** the schema does NOT require top-level `version`, `tasks`, `groups`, `timer`, `timerSettings`, `planner`, or `routines` fields

#### Scenario: The registry imports each participating feature's save slice

- **WHEN** the data-portability feature is initialised
- **THEN** its registry imports save slices from `@/features/groups`, `@/features/tasks`, `@/features/timer`, `@/features/planner`, and `@/features/routines`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner, routines
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state needed for the app-level save snapshot by calling every registered slice's `exportSlice`. The returned object SHALL be a plain JavaScript object, not a string; callers are responsible for serialising it. File Export, file Import, Google Drive Backup, and Google Drive Restore SHALL all use this same canonical snapshot contract.

#### Scenario: Building a snapshot includes every registered slice

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `envelopeVersion: 1` and `exportedAt: <current ISO string>`
- **AND** it has a `slices` object
- **AND** for each slice in the registry, the slice's `exportSlice()` is called and the result is stored under the slice's `name`
- **AND** the order of fields in `slices` follows the order of slices in the registry
- **AND** `slices.routines` contains the routines feature save payload

#### Scenario: Building a snapshot includes timer settings only

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object's `slices.timerSettings` field is populated from the timer store's settings
- **AND** the returned object does not include a top-level `timer` field
- **AND** the returned object does not include timer runtime fields such as `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, or `sessionPomoCount`

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

## ADDED Requirements

### Requirement: Routines participate in snapshot and restore

The system SHALL include the routines feature in the snapshot/restore system through a `routinesSaveSlice` exported from the routines feature barrel. The slice SHALL export and apply the routines feature state, including routine definitions and `stepCompletionsByDate`. The slice SHALL provide an empty-state missing-slice default so current-envelope exports created before routines existed can still import successfully.

#### Scenario: Snapshot includes routines

- **WHEN** `buildSnapshot` is called and routines exist
- **THEN** the returned envelope includes `slices.routines` containing the routines feature state

#### Scenario: Missing routines slice imports as empty state

- **WHEN** `prepareSnapshotImport` receives a valid current envelope without `slices.routines`
- **THEN** the routines slice prepares its empty default state
- **AND** committing the prepared snapshot leaves the routines store with no routines and no step completions

#### Scenario: Commit restores routines

- **WHEN** `commitSnapshotImport` is called with a prepared snapshot containing routines
- **THEN** the routines store is updated with the imported routine state

#### Scenario: Invalid routines slice rejects import

- **WHEN** `prepareSnapshotImport` receives an envelope whose `slices.routines` payload fails routines schema validation
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no feature store is modified
