## MODIFIED Requirements

### Requirement: User can export data as JSON

The system SHALL allow users to download all restorable DayBox save snapshot data as a JSON file using the current save envelope. The snapshot SHALL include feature-owned slices for tasks, groups, timer settings, and planner preferences. View state, timer runtime state, Google Drive auth state, and theme SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (`daybox-export.json`) is downloaded with `envelopeVersion: 1`
- **AND** the file includes `exportedAt` and a nested `slices` object
- **AND** the `slices` object includes `tasks`, `groups`, `timerSettings`, and `planner`
- **AND** the file does not include top-level `timer`
- **AND** the file does not include timer runtime fields such as `phase`, `startedAt`, `elapsed`, `isRunning`, `focusedTaskId`, or `sessionPomoCount`
- **AND** the file does not include `theme`

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore save snapshot data into the owning stores. The import MUST accept the current nested envelope and supported legacy flat files with `version: 2` and `version: 3`. Import preparation SHALL parse or adapt the envelope, prepare every registered feature slice, normalize cross-slice invariants without mutating stores, and commit only after preparation succeeds and the user confirms replacement.

#### Scenario: Import current data

- **WHEN** user selects a current-envelope JSON file via the "Import" button in settings
- **THEN** the file is prepared through data-portability without mutating stores
- **AND** after the user confirms replacement, tasks, groups, timer settings, and planner preferences are replaced with the prepared snapshot data
- **AND** theme is left unchanged

#### Scenario: Import v3 data

- **WHEN** user selects a flat `version: 3` JSON file via the "Import" button in settings
- **THEN** the file is adapted to the current nested envelope shape during preparation
- **AND** the top-level `timer` field is restored through the current `timerSettings` slice after commit

#### Scenario: Import v2 data

- **WHEN** user selects a flat `version: 2` JSON file via the "Import" button in settings
- **THEN** the file is adapted to the current nested envelope shape during preparation
- **AND** `tasks` and `groups` are restored through their current slices after commit
- **AND** `settings.timer` is restored through the current `timerSettings` slice after commit
- **AND** `settings.weekStartDay` and `browseDate: null` are combined into the current `planner` slice after commit
- **AND** `settings.theme` is dropped and the local theme is left unchanged
