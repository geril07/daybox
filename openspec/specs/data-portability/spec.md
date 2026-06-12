## Purpose

Define the cross-cutting snapshot/restore mechanics that DayBox uses for backup, restore, and portability: the explicit aggregate snapshot contract, compose-feature-schemas validation, prepare/commit pipeline, version migrations, and snapshot normalization. Behavioural rules for individual features live in their own capability files; this capability only governs the _wire format_ and the orchestrator.

## Requirements

### Requirement: The data-portability feature owns the snapshot envelope, registry, and migrations

The system SHALL organise the cross-cutting snapshot/restore logic in a dedicated `data-portability` feature at `src/features/data-portability/`. The data-portability feature SHALL own the app-level snapshot boundary and SHALL separate the import/export pipeline into single-purpose responsibilities:

- The current snapshot version constant and supported-version detection.
- The canonical current snapshot schema and inferred current snapshot type.
- JSON parsing and current snapshot parsing helpers.
- Version migrations that transform supported older envelope shapes into the current shape (e.g. v2 → current).
- Normalization of repairable domain invariants on typed current snapshots.
- The `buildSnapshot` function that assembles the current snapshot from feature stores.
- The preparation function that parses, migrates, validates, and normalizes an import without mutating stores.
- The commit function that writes a `PreparedSnapshot` to feature stores.

The data-portability feature SHALL NOT import from `src/app/*`. It MAY import from the barrels of other features and from `src/shared/*` because it is the explicit cross-cutting app snapshot boundary.

The data-portability feature has no UI of its own. Its public surface is the functions and types in its barrel.

#### Scenario: The pipeline has separated stages

- **WHEN** data-portability prepares an import
- **THEN** JSON parsing, version detection, migration, current snapshot parsing, normalization, and commit are implemented as separate stages with narrow responsibilities
- **AND** store mutation happens only in the commit stage

#### Scenario: The envelope schema defines the current shape

- **WHEN** data-portability parses a current snapshot
- **THEN** the schema requires `version: literal(CURRENT_SNAPSHOT_VERSION)`, `exportedAt: string`, and the current feature fields `tasks`, `groups`, `timer`, and `planner`
- **AND** the schema validates the full payloads for those fields using feature-owned schemas
- **AND** the schema does NOT require a `theme` field because theme is intentionally excluded from the snapshot

#### Scenario: The v2 envelope is migrated to current

- **WHEN** preparation receives a JSON string with `version: 2`
- **THEN** the v2-to-current migration function transforms the v2 shape into the current shape
- **AND** `settings.timer` is lifted to the top-level `timer` field
- **AND** `settings.weekStartDay` and a fresh `browseDate: null` are combined into the top-level `planner` field
- **AND** `settings.theme` is dropped
- **AND** `version` is set to `CURRENT_SNAPSHOT_VERSION` and `exportedAt` is filled in if missing
- **AND** the resulting value is then parsed by the current snapshot schema

### Requirement: `buildSnapshot` assembles the current envelope

The system SHALL provide a `buildSnapshot` function in the data-portability feature that reads the current state needed for the app-level snapshot and returns a typed current snapshot object. The returned object SHALL be a plain JavaScript object, not a string; callers are responsible for serialising it.

#### Scenario: Building a snapshot includes every current snapshot field

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has `version: CURRENT_SNAPSHOT_VERSION` and `exportedAt: <current ISO string>`
- **AND** it includes `tasks`, `groups`, `timer`, and `planner` fields populated from their owning stores
- **AND** TypeScript can represent the returned value as the current snapshot type rather than only `Record<string, unknown>`

#### Scenario: Building a snapshot does not include the theme

- **WHEN** `buildSnapshot` is called
- **THEN** the returned object has no `theme` field
- **AND** the user's theme preference is left untouched by the build

### Requirement: Current snapshot composes feature-owned schemas

The system SHALL define a current snapshot schema in data-portability that composes the zod schemas owned by participating features. The current snapshot schema SHALL validate the full current restorable app snapshot, including `version`, `exportedAt`, `tasks`, `groups`, `timer`, and `planner`. The data-portability feature owns the aggregate wire contract; individual features continue to own their local schemas and types.

#### Scenario: Current snapshot validates full payloads

- **WHEN** a current snapshot contains invalid task, group, timer, or planner data
- **THEN** parsing the current snapshot fails
- **AND** the import is not eligible to be committed to stores

#### Scenario: Feature schemas remain source of truth

- **WHEN** data-portability defines the current snapshot schema
- **THEN** it composes `TaskSchema`, `GroupSchema`, `TimerSettingsSchema`, and `PlannerStateSchema`
- **AND** it does not duplicate those feature-owned shape definitions by hand

### Requirement: Current snapshot validates aggregate identifiers

The system SHALL reject current snapshot payloads whose individually valid records do not form a safe aggregate. Snapshot parsing SHALL require unique task ids, unique group ids, and no duplicate canonical default group. These checks happen before normalization and before a `PreparedSnapshot` can be created.

#### Scenario: Duplicate task ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current snapshot with two tasks that share the same `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate group ids reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current snapshot with two groups that share the same `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no store state is modified

#### Scenario: Duplicate default groups reject import preparation

- **WHEN** `prepareSnapshotImport` receives a current snapshot with more than one group whose `id` is the canonical default-group id
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** normalization does not attempt to choose between the duplicate defaults

### Requirement: Supported snapshot versions are explicit

The system SHALL define the current snapshot version separately from the list of supported import versions. Version detection SHALL use the supported-version list, and migrations SHALL handle supported legacy versions explicitly before current snapshot parsing. When a future current version is introduced, the code SHALL require an explicit decision about whether the previous version remains supported through migration.

#### Scenario: Supported legacy version is accepted for migration

- **WHEN** `prepareSnapshotImport` receives a snapshot with `version: 2`
- **THEN** version detection accepts it as a supported legacy version
- **AND** migration converts it to the current snapshot version before current parsing

#### Scenario: Unsupported version is rejected before parsing current payload

- **WHEN** `prepareSnapshotImport` receives a snapshot with a version not listed in supported versions
- **THEN** preparation returns `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no current snapshot parsing or store mutation occurs

### Requirement: Snapshot import is prepared before commit

The system SHALL split snapshot import into a preparation phase and a commit phase. Preparation SHALL parse JSON, detect the snapshot version, migrate supported old versions to the current shape, parse the current snapshot, normalize repairable domain invariants, and return a `PreparedSnapshot` plus warnings. Preparation SHALL NOT mutate feature stores. Commit SHALL accept a `PreparedSnapshot` and apply it to feature stores. `PreparedSnapshot` SHALL be a distinct TypeScript type from `CurrentSnapshot` so callers cannot accidentally commit a current snapshot that has not passed through normalization.

#### Scenario: Preparing a valid import does not mutate stores

- **WHEN** `prepareSnapshotImport` receives a valid import JSON string
- **THEN** it returns `{ ok: true, snapshot: <prepared snapshot> }` with optional warnings
- **AND** no feature store is modified before `commitSnapshotImport` is called

#### Scenario: Committing a prepared import mutates stores

- **WHEN** `commitSnapshotImport` receives a `PreparedSnapshot`
- **THEN** it writes the snapshot's tasks, groups, timer settings, and planner state to their owning stores
- **AND** it does not parse JSON, run migrations, or perform normalization

#### Scenario: Unprepared snapshots cannot be committed directly

- **WHEN** application code has a `CurrentSnapshot` value returned by the current snapshot parser
- **THEN** TypeScript does not allow that value to be passed directly to `commitSnapshotImport`
- **AND** the value must first pass through snapshot normalization to become a `PreparedSnapshot`

#### Scenario: Invalid current payload rejects whole import

- **WHEN** a snapshot has the current version and required fields but one feature payload fails its schema
- **THEN** `prepareSnapshotImport` returns `{ ok: false, reason: <message> }`
- **AND** `commitSnapshotImport` is not called
- **AND** no feature store is modified

### Requirement: Snapshot normalization repairs known invariants before commit

The system SHALL normalize repairable domain invariants after current snapshot parsing and before commit. Normalization SHALL accept a typed current snapshot and return a `PreparedSnapshot`; it MAY return warnings describing repairs. The current repairable invariants are group fallback safety and task-to-group references: the prepared snapshot's groups SHALL include the canonical default group, and every prepared task's `groupId` SHALL reference a group in the prepared snapshot. Dangling task group ids are replaced with the canonical default group id.

#### Scenario: Dangling task group is repaired during preparation

- **WHEN** `prepareSnapshotImport` receives a snapshot with valid tasks and groups, but a task references a missing group id
- **THEN** preparation returns an ok result whose snapshot has that task's `groupId` set to the canonical default group id
- **AND** the result includes a warning naming the dangling group id
- **AND** no store is modified until the prepared snapshot is committed

#### Scenario: Missing default group is repaired during preparation

- **WHEN** `prepareSnapshotImport` receives a snapshot whose groups do not include the canonical default group id
- **THEN** preparation returns an ok result whose snapshot includes a valid default group
- **AND** tasks that need fallback reassignment can point at an existing default group
- **AND** the result includes a warning that the default group was restored

#### Scenario: Normalization is not a store mutation step

- **WHEN** normalization repairs a current snapshot
- **THEN** it returns a prepared snapshot value
- **AND** it does not call any feature store setter or action
