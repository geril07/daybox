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
