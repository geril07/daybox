## MODIFIED Requirements

### Requirement: All state persisted to localStorage

The system SHALL save tasks, groups, and settings to localStorage in three independent keys (`daybox-tasks`, `daybox-groups`, `daybox-settings`). Timer runtime state (phase, elapsed, isRunning, focusedTaskId) SHALL NOT be persisted.

#### Scenario: Tasks persist on reload

- **WHEN** user creates a task and reloads the page
- **THEN** the task appears in the same state as before reload

#### Scenario: Groups persist on reload

- **WHEN** user creates a group and reloads the page
- **THEN** the group appears in the same state as before reload

#### Scenario: Settings persist on reload

- **WHEN** user changes a theme setting and reloads the page
- **THEN** the theme setting is preserved

#### Scenario: Timer state does not persist

- **WHEN** user is running a pomodoro and reloads the page
- **THEN** the timer resets to initial state (focus phase, not running, 0 elapsed)

### Requirement: User can export data as JSON

The system SHALL allow users to download all app data (tasks, groups, settings) as a JSON file. The exported file format SHALL be identical to the current format (flat `tasks`, `groups`, `settings` keys). View state and timer runtime state SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (daybox-export.json) is downloaded with all tasks, groups, and settings

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore data into the three persisted stores.

#### Scenario: Import data

- **WHEN** user selects a JSON file via the "Import" button in settings
- **THEN** all existing tasks, groups, and settings are replaced with the imported data

#### Scenario: Import confirms before overwriting

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

## ADDED Requirements

### Requirement: One-shot migration from single store

The system SHALL migrate existing localStorage data from the old `daybox-app-store` key to the three new keys on first load after deploy, and delete the old key.

#### Scenario: Migration runs on first load

- **WHEN** a user loads the app and `daybox-app-store` exists in localStorage
- **THEN** the old state is written to `daybox-tasks`, `daybox-groups`, `daybox-settings` and `daybox-app-store` is deleted

#### Scenario: Migration does not run on subsequent loads

- **WHEN** a user loads the app and `daybox-app-store` does not exist
- **THEN** migration is skipped
