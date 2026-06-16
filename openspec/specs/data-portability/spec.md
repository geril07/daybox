## Purpose

Define the cross-cutting save/restore mechanics that DayBox uses for file export/import and Google Drive backup/restore: the nested save envelope, feature-owned save slices, all-or-nothing prepare/commit pipeline, v2 `SaveSlice` contract with `validateExport`/`postPrepare`/`migrateFrom` hooks, and typed `allSlices` parameter via `SaveSliceMap` module augmentation. Behavioural rules for individual features live in their own capability files; this capability governs the wire format and orchestrator.

## Requirements

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
- **THEN** its registry imports save slices from `@/modules/groups`, `@/modules/tasks`, `@/modules/timer`, and `@/modules/planner`
- **AND** exports a `saveSlices` array whose order is canonical and dependency-aware: groups, tasks, timerSettings, planner
- **AND** a feature that wants to participate in save/restore is added by exporting a save slice from the feature barrel and adding it to the registry
- **AND** the registry augments the `SaveSliceMap` interface with the concrete slice type for each registered slice name so that `postPrepare` receives a typed `allSlices` parameter

#### Scenario: Feature save adapters depend on the shared contract

- **WHEN** a feature-owned save adapter declares its save slice
- **THEN** it imports `SaveSlice`, `PrepareResult`, and related generic save-slice types from `@/shared/save-slice`
- **AND** it does NOT import those generic contracts from `@/modules/data-portability` or `@/modules/data-portability/types`

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state needed for the app-level save snapshot by calling every registered slice's `exportSlice`. After each `exportSlice` call, if the slice declares a `validateExport` hook, `buildSnapshot` SHALL call it and abort the export if validation fails. The returned object SHALL be a plain JavaScript object, not a string; callers are responsible for serialising it. File Export, file Import, Google Drive Backup, and Google Drive Restore SHALL all use this same canonical snapshot contract.

#### Scenario: Building a snapshot includes every registered slice

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `envelopeVersion: 1` and `exportedAt: <current ISO string>`
- **AND** it has a `slices` object
- **AND** for each slice in the registry, the slice's `exportSlice()` is called and the result is stored under the slice's `name`
- **AND** the order of fields in `slices` follows the order of slices in the registry

#### Scenario: Export validation catches corrupt store data

- **WHEN** `buildSnapshot` is called and a slice declares `validateExport`
- **THEN** `validateExport` is called with the value returned by `exportSlice`
- **AND** if `validateExport` returns `{ ok: false, reason }`, `buildSnapshot` aborts and returns that error
- **AND** no export file is produced

#### Scenario: Building a snapshot includes timer settings only

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object's `slices.timerSettings` field is populated from the timer store's settings
- **AND** the returned object does not include a top-level `timer` field
- **AND** the returned object does not include timer runtime fields such as `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, or `sessionPomoCount`

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

#### Scenario: Export validates the assembled envelope against the schema

- **WHEN** `buildSnapshot` has called all `exportSlice` and optional `validateExport` hooks and assembled the envelope
- **THEN** the assembled envelope is validated against `SaveEnvelopeSchema` via `safeParse`
- **AND** if validation fails, `buildSnapshot` aborts and returns the structured error
- **AND** this catches structural bugs (e.g., a slice returning a non-object value) at build time rather than on re-import

### Requirement: Current snapshot composes feature-owned save slices

The system SHALL define the current save envelope in data-portability while individual feature slices define and validate their own current slice payloads. Data-portability SHALL compose registered feature slices during build, prepare, and commit. Individual features SHALL own their local save schemas and types. Each slice's `TCurrent` type parameter SHALL extend `{ version: number }` so that the pipeline can detect the slice-level version for migration chain walking.

#### Scenario: Current snapshot validates full payloads through slices

- **WHEN** a current save envelope contains invalid task, group, timer settings, or planner slice data
- **THEN** the relevant slice's `prepareImport` fails
- **AND** the whole import preparation fails
- **AND** the import is not eligible to be committed to stores

#### Scenario: Feature save schemas remain source of truth for slice payloads

- **WHEN** data-portability prepares a current save envelope
- **THEN** it passes each raw slice payload through the migration chain (if the input version differs from `currentVersion`), then through that feature's `prepareImport`
- **AND** it does not duplicate task, group, timer-settings, or planner shape definitions by hand

### Requirement: Supported snapshot versions are explicit

The system SHALL support the current nested save envelope only. Current nested envelopes use `envelopeVersion`. Flat app-level snapshots with top-level `version: 2` or `version: 3` SHALL be rejected before store mutation with a structured error message containing the field path and expected value, the same as unsupported envelope versions or unrecognized files.

#### Scenario: Current envelope is accepted

- **WHEN** `prepareSnapshotImport` receives a valid nested save envelope with `envelopeVersion: 1`
- **THEN** data-portability parses the current envelope shape
- **AND** passes the envelope's slice payloads through the registered slice `prepareImport` path

#### Scenario: Legacy flat versions are rejected

- **WHEN** `prepareSnapshotImport` receives a flat legacy snapshot with top-level `version: 2` or `version: 3`
- **THEN** preparation returns `{ ok: false, reason: "envelope.envelopeVersion: <error>" }`
- **AND** no slice preparation or store mutation occurs

#### Scenario: Unsupported version is rejected before parsing current payload

- **WHEN** `prepareSnapshotImport` receives a snapshot with an unsupported `envelopeVersion` or an unrecognized version shape
- **THEN** preparation returns `{ ok: false, reason: "envelope.<path>: <message>" }`
- **AND** no slice preparation or store mutation occurs

### Requirement: Snapshot import is prepared before commit

The system SHALL split snapshot import into a preparation phase and a commit phase. Preparation SHALL parse JSON, parse the current envelope, walk the migration chain for each slice, call `prepareImport`, call each slice's optional `postPrepare` (providing the full prepared slice map), and return a `PreparedSnapshot` plus warnings. Preparation SHALL NOT mutate feature stores. Commit SHALL accept a `PreparedSnapshot` and apply every slice in registry order, wrapped in try/catch so that failure reports which slice threw and which slices were already committed. `PreparedSnapshot` SHALL be a distinct TypeScript type from the parsed envelope so callers cannot accidentally commit data that has not passed through slice preparation.

#### Scenario: Preparing a valid import does not mutate stores

- **WHEN** `prepareSnapshotImport` receives a valid import JSON string
- **THEN** it returns `{ ok: true, snapshot: <prepared snapshot> }` with optional warnings
- **AND** no feature store is modified before `commitSnapshotImport` is called

#### Scenario: Migration chain runs before prepareImport

- **WHEN** `prepareSnapshotImport` receives a slice payload whose `version` field is less than the slice's `currentVersion`
- **THEN** the pipeline walks `migrateFrom` entries in ascending order (version, version+1, …) until `version` equals `currentVersion`
- **AND** each migration receives the output of the previous migration (or the raw input for the first hop)
- **AND** if any migration returns `{ ok: false }`, the entire import preparation fails
- **AND** `prepareImport` receives data at `currentVersion`

#### Scenario: postPrepare runs after all slices prepare

- **WHEN** all registered slices have passed their `prepareImport` stage
- **THEN** the pipeline iterates the slices again in registry order and calls each slice's `postPrepare` (if present)
- **AND** each `postPrepare` receives the slice's own prepared data and the full `allSlices` map
- **AND** `postPrepare` may modify the slice's own data and emit warnings
- **AND** the result of all postPrepare calls together forms the `PreparedSnapshot`

#### Scenario: Committing a prepared import mutates stores

- **WHEN** `commitSnapshotImport` receives a `PreparedSnapshot`
- **THEN** it calls each registered slice's `applyImport` in canonical registry order
- **AND** it does not parse JSON, run slice migrations, or perform normalization

#### Scenario: Commit failure reports which slices were touched

- **WHEN** `commitSnapshotImport` is called and one slice's `applyImport` throws
- **THEN** commit returns `{ ok: false, reason: <message>, committed: [<slice names committed before the failure>] }`
- **AND** slices committed before the failure remain written to their stores (no rollback)
- **AND** no further slices are committed after the failure

#### Scenario: Unprepared snapshots cannot be committed directly

- **WHEN** application code has a current envelope value returned by the envelope parser
- **THEN** TypeScript does not allow that value to be passed directly to `commitSnapshotImport`
- **AND** the value must first pass through slice preparation to become a `PreparedSnapshot`

#### Scenario: Invalid current payload rejects whole import

- **WHEN** a save envelope has a valid envelope shape but one registered slice fails `prepareImport`
- **THEN** `prepareSnapshotImport` returns `{ ok: false, reason: <message> }`
- **AND** `commitSnapshotImport` is not called
- **AND** no feature store is modified

### Requirement: Feature save slices own their versions and migrations

The system SHALL represent each save-participating feature as a save slice. A save slice SHALL declare its name, current version, missing-slice strategy, export function, optional export validation, migration chain (`migrateFrom`), import preparation function (`prepareImport`), optional cross-slice repair function (`postPrepare`), and import apply function (`applyImport`) using the generic save-slice contract from `@/shared/save-slice`. Feature-owned slice schemas, slice-local defaults, slice-local validation, migration functions, postPrepare logic, and validateExport logic SHALL live in the owning feature.

The `missing` field SHALL declare either `{ kind: 'required' }` or `{ kind: 'useDefault', defaultValue: TCurrent }`. The `useDefault` variant uses an eager `defaultValue` constant, not a lazy factory function.

#### Scenario: A feature exports a save slice

- **WHEN** a feature participates in save/restore
- **THEN** its barrel exports a save slice with `name`, `currentVersion`, `missing`, `exportSlice`, optional `validateExport`, optional `migrateFrom`, `prepareImport`, optional `postPrepare`, and `applyImport`
- **AND** `exportSlice` returns the feature's current save slice payload including a slice-level `version`
- **AND** `validateExport` (if present) validates the output of `exportSlice` against the current schema
- **AND** `migrateFrom` (if present) maps from-version numbers to migration functions that upgrade from that version to the next
- **AND** `prepareImport` accepts `unknown`, validates the payload at `currentVersion`, and returns the current slice payload after running slice-local validation (duplicate-id checks, default-group restoration)
- **AND** `postPrepare` (if present) receives the slice's prepared data and the full `allSlices` map for cross-slice repair
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
- **AND** `{ kind: 'useDefault', defaultValue }` uses the eager `defaultValue` constant and prepares/applies that value
- **AND** there is no skip strategy; a registered slice either requires input or provides a default

#### Scenario: Save-slice contracts are not exported by data-portability

- **WHEN** code needs the generic save-slice contract types
- **THEN** it imports them from `@/shared/save-slice`
- **AND** it does not import or re-export those contracts through `@/modules/data-portability`

### Requirement: Cross-slice repair is owned by dependent slices via postPrepare

The system SHALL move cross-slice invariant repair out of the centralized `normalizeCrossSliceInvariants` function and into each dependent slice's `postPrepare` hook. A slice that depends on another slice's data for correctness (e.g., tasks depend on groups for valid `groupId` references) SHALL implement `postPrepare`. Slices with no cross-slice dependencies SHALL omit `postPrepare`. The pipeline SHALL call `postPrepare` on each slice (if present) after all slices have passed `prepareImport`.

#### Scenario: Tasks slice repairs dangling group references in postPrepare

- **WHEN** `prepareSnapshotImport` receives a snapshot with a task whose `groupId` does not exist in the prepared groups
- **THEN** the tasks slice's `postPrepare` reassigns that task's `groupId` to the default group ID
- **AND** a warning is emitted naming the dangling group ID
- **AND** the preparation succeeds

#### Scenario: Slice without cross-slice dependencies has no postPrepare

- **WHEN** a feature (e.g., timer settings, planner) has no dependency on another slice's data
- **THEN** its save slice omits the `postPrepare` field
- **AND** the pipeline skips `postPrepare` for that slice without error

#### Scenario: Adding a dependent feature does not require central file edits

- **WHEN** a new feature (e.g., routines) depends on another slice and needs cross-slice repair
- **THEN** the feature implements `postPrepare` in its own save slice
- **AND** no file in `src/modules/data-portability/` is edited to support the new repair logic

### Requirement: Envelope parsing uses standardized result types and structured errors

The system SHALL use the shared `PrepareResult<T>` type for envelope parsing (`parseSaveEnvelope` returns `PrepareResult<SaveEnvelope>`), eliminating the custom `ParseEnvelopeResult` type. Envelope validation errors SHALL include the specific zod issue path and message (e.g., `"envelope.envelopeVersion: Expected 1, received 2"`) rather than an opaque string. Envelope parsing SHALL validate that every key in `slices` matches a registered slice name from the registry, rejecting unknown keys with a clear message (`"envelope.slices.<key>: Unknown slice — not a registered feature"`).

#### Scenario: parseSaveEnvelope returns PrepareResult<SaveEnvelope>

- **WHEN** `parseSaveEnvelope` is called
- **THEN** on success it returns `{ ok: true, value: <SaveEnvelope> }` (using `value` not `envelope`)
- **AND** on failure it returns `{ ok: false, reason: "<path>: <message>" }`
- **AND** the custom `ParseEnvelopeResult` type is removed

#### Scenario: Unknown slice keys in envelope are rejected at parse time

- **WHEN** `parseSaveEnvelope` receives a JSON object with `slices: { tasks: [...], unknownCustom: true }`
- **THEN** parsing fails with `{ ok: false, reason: "envelope.slices.unknownCustom: Unknown slice — not a registered feature" }`
- **AND** `prepareImport` on any slice has not yet been called

#### Scenario: Known slice keys pass envelope key validation

- **WHEN** `parseSaveEnvelope` receives `slices: { groups: {...}, tasks: {...}, timerSettings: {...}, planner: {...} }`
- **THEN** all keys match registered slice names and parsing succeeds
- **AND** the parsed envelope continues to per-slice preparation

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
