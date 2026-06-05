## Purpose

Persist all user data (tasks, groups, timer configuration, planner preferences, and theme) to localStorage across five independent keys, and provide export/import as JSON files for manual backup. Timer runtime state is ephemeral and not persisted.

## Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, timer state, planner preferences, and theme to localStorage in five independent keys: `daybox-tasks`, `daybox-groups`, `daybox-timer`, `daybox-planner`, and `daybox-theme`. Timer runtime state (`phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`) SHALL NOT be persisted. The timer's configuration slice (durations, auto-start, alarm) SHALL be persisted under `daybox-timer` alongside the timer state. The planner's preferences (`weekStartDay`, `browseDate`) SHALL be persisted under `daybox-planner`. The theme (`light` or `dark`) SHALL be persisted under `daybox-theme`. The legacy `daybox-settings` key SHALL NOT be used by the running app.

#### Scenario: Tasks persist on reload

- **WHEN** user creates a task and reloads the page
- **THEN** the task appears in the same state as before reload

#### Scenario: Groups persist on reload

- **WHEN** user creates a group and reloads the page
- **THEN** the group appears in the same state as before reload

#### Scenario: Timer configuration persists on reload

- **WHEN** user changes the focus duration to 30 minutes and reloads the page
- **THEN** the timer uses 30 minutes for focus intervals

#### Scenario: Planner preferences persist on reload

- **WHEN** user sets the first day of the week to Sunday and reloads the page
- **THEN** the Week view renders Sunday through Saturday

#### Scenario: Theme persists on reload

- **WHEN** user toggles dark theme on and reloads the page
- **THEN** the UI is rendered in dark mode on first paint

#### Scenario: Timer runtime state does not persist

- **WHEN** user is running a pomodoro and reloads the page
- **THEN** the timer resets to initial state (focus phase, not running, 0 elapsed)

### Requirement: User can export data as JSON

The system SHALL allow users to download all app data (tasks, groups, timer state, planner preferences, theme) as a JSON file with `version: 3`. View state and timer runtime state SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (`daybox-export.json`) is downloaded with `version: 3` and the five sections `tasks`, `groups`, `timer`, `planner`, `theme`

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore data into the five persisted stores. The import MUST accept files with `version: 2` (legacy single-settings shape) and `version: 3` (current five-key shape).

#### Scenario: Import v3 data

- **WHEN** user selects a `version: 3` JSON file via the "Import" button in settings
- **THEN** all five persisted stores are replaced with the imported data

#### Scenario: Import v2 data

- **WHEN** user selects a `version: 2` JSON file via the "Import" button in settings
- **THEN** `tasks` and `groups` are restored as-is
- **AND** `settings.timer` is written to the timer's settings slice
- **AND** `settings.weekStartDay` is written to the planner store
- **AND** `settings.theme` is written to the theme store

#### Scenario: Import confirms before overwriting

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

### Requirement: One-shot migration from single store

The system SHALL migrate existing localStorage data from the old `daybox-app-store` key to the five new keys on first load after deploy, and delete the old key.

#### Scenario: Migration runs on first load

- **WHEN** a user loads the app and `daybox-app-store` exists in localStorage
- **THEN** the old state is written to `daybox-tasks`, `daybox-groups`, and `daybox-settings` (intermediate) and `daybox-app-store` is deleted

#### Scenario: Migration does not run on subsequent loads

- **WHEN** a user loads the app and `daybox-app-store` does not exist
- **THEN** migration is skipped

### Requirement: One-shot migration from god-settings key

The system SHALL migrate existing localStorage data from the intermediate `daybox-settings` key (introduced in the v1 split) to the per-feature keys on first load after this deploy, and delete `daybox-settings`.

#### Scenario: Migration runs on first load with daybox-settings

- **WHEN** a user loads the app, `daybox-app-store` does not exist, and `daybox-settings` exists
- **THEN** `settings.timer` is written to the timer's settings slice
- **AND** `settings.weekStartDay` is written to the planner store
- **AND** `settings.theme` is written to the theme store
- **AND** `daybox-settings` is deleted

#### Scenario: Migration is idempotent

- **WHEN** a user loads the app and `daybox-settings` does not exist
- **THEN** the migration is skipped and the five feature-owned keys are read directly

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
