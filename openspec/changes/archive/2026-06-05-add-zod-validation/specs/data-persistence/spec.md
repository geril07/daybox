## ADDED Requirements

### Requirement: Import applies a per-layer validation policy

The system SHALL validate every imported export JSON through a per-layer policy: envelope hard-fail, per-record warn+skip, cross-reference warn+reassign, optional-field coerce. The full policy is defined in the `data-validation` capability. `parseImport` SHALL return `{ success: false, error }` on envelope failure, and `{ success: true, data, warnings? }` otherwise. `warnings` SHALL be present whenever any record was dropped or any reference was reassigned.

#### Scenario: v3 import with a malformed task

- **WHEN** a user imports a v3 file containing 10 valid tasks and 1 task missing its `id`
- **THEN** the result is `{ success: true, data: { tasks: <10 valid tasks>, ... } }`
- **AND** `warnings` contains a reason naming the dropped task

#### Scenario: v3 import with a dangling groupId

- **WHEN** a user imports a v3 file where task T points at group G that does not exist
- **THEN** task T is imported with `groupId: 'default'`
- **AND** `warnings` notes the dangling reference

#### Scenario: v3 import with an unrecognized theme

- **WHEN** a user imports a v3 file with `theme: 'sepia'`
- **THEN** the imported theme is `'light'` (default)
- **AND** no warning is added (optional-layer coercion is silent)

#### Scenario: Envelope failure rejects the import

- **WHEN** a user imports a JSON file missing the `version` field
- **THEN** the result is `{ success: false, error: 'Not a DayBox export file.' }`
- **AND** no store state is modified

### Requirement: Persist rehydration validates and falls back

The system SHALL validate the persisted blob for each of the four feature stores (`daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`) on app load using its feature's schema. On failure, the store SHALL be initialized to its default state and a `console.warn` SHALL be emitted once. The on-disk blob SHALL NOT be deleted automatically; the next successful write replaces it.

#### Scenario: Corrupt tasks blob resets to empty

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a blob that fails `TaskSchema`
- **THEN** the task store starts with `tasks: []`
- **AND** `console.warn` is called once

#### Scenario: Valid tasks blob is used as-is

- **WHEN** `localStorage.getItem('daybox-tasks')` returns a valid blob
- **THEN** the task store starts with the persisted tasks
- **AND** no warn is emitted

### Requirement: Legacy migrations validate before writing

The system SHALL validate the parsed `daybox-app-store` and `daybox-settings` legacy blobs against their expected shape (using zod) before writing to the new feature stores. On validation failure, the affected migration SHALL be skipped and a `console.warn` SHALL be emitted. The legacy key SHALL be removed regardless of whether the migration succeeded (so a bad blob doesn't keep re-firing).

#### Scenario: Legacy daybox-app-store migration with valid shape

- **WHEN** the app loads and `daybox-app-store` exists with a valid v1 shape
- **THEN** `tasks`, `groups`, and `settings` are migrated to the new feature stores
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-app-store migration with invalid shape

- **WHEN** the app loads and `daybox-app-store` exists with a shape that fails the migration schema
- **THEN** the migration is skipped (new feature stores keep their current state)
- **AND** `console.warn` is emitted
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-settings migration with valid shape

- **WHEN** the app loads and `daybox-settings` exists with a valid v1 shape
- **THEN** `settings.timer`, `settings.weekStartDay`, and `settings.theme` are written to the relevant feature stores
- **AND** the legacy key is removed

#### Scenario: Legacy daybox-settings migration with invalid shape

- **WHEN** the app loads and `daybox-settings` exists with a shape that fails the migration schema
- **THEN** the migration is skipped
- **AND** `console.warn` is emitted
- **AND** the legacy key is removed
