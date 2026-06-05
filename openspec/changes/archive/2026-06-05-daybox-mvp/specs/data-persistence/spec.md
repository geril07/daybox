## ADDED Requirements

### Requirement: All state persisted to localStorage

The system SHALL save all tasks, groups, settings, and timer state to localStorage on every change.

#### Scenario: Task persists on reload

- **WHEN** user creates a task and reloads the page
- **THEN** the task appears in the same state as before reload

### Requirement: User can export data as JSON

The system SHALL allow users to download all app data as a JSON file.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (daybox-export.json) is downloaded with all tasks, groups, and settings

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore data.

#### Scenario: Import data

- **WHEN** user selects a JSON file via the "Import" button in settings
- **THEN** all existing data is replaced with the imported data

#### Scenario: Import confirms before overwriting

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced
