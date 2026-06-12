## MODIFIED Requirements

### Requirement: User can export data as JSON

The system SHALL allow users to download all restorable DayBox snapshot data as a JSON file with the current snapshot version. The snapshot SHALL include tasks, groups, timer settings, and planner preferences. View state, timer runtime state, Google Drive auth state, and theme SHALL NOT be included in the export.

#### Scenario: Export data

- **WHEN** user clicks "Export" in settings
- **THEN** a JSON file (`daybox-export.json`) is downloaded with `version: CURRENT_SNAPSHOT_VERSION`
- **AND** the file includes the sections `tasks`, `groups`, `timer`, and `planner`
- **AND** the file does not include `theme`

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported JSON file to restore snapshot data into the owning stores. The import MUST accept supported legacy files with `version: 2` and current files with `CURRENT_SNAPSHOT_VERSION`. Import preparation SHALL parse, migrate, validate, and normalize the snapshot without mutating stores. Import commit SHALL replace the restorable stores only after preparation succeeds and the user confirms replacement.

#### Scenario: Import current data

- **WHEN** user selects a current-version JSON file via the "Import" button in settings
- **THEN** the file is prepared through data-portability without mutating stores
- **AND** after the user confirms replacement, tasks, groups, timer settings, and planner preferences are replaced with the prepared snapshot data
- **AND** theme is left unchanged

#### Scenario: Import v2 data

- **WHEN** user selects a `version: 2` JSON file via the "Import" button in settings
- **THEN** the file is migrated to the current snapshot shape during preparation
- **AND** `tasks` and `groups` are restored from the migrated snapshot after commit
- **AND** `settings.timer` is written to the timer settings after commit
- **AND** `settings.weekStartDay` and `browseDate: null` are written to the planner store after commit
- **AND** `settings.theme` is dropped and the local theme is left unchanged

#### Scenario: Import confirms before committing

- **WHEN** user selects a JSON file that prepares successfully
- **THEN** a confirmation dialog warns that current data will be replaced
- **AND** stores are not modified unless the user confirms

#### Scenario: Import cancellation preserves local data

- **WHEN** user selects a JSON file that prepares successfully and then cancels the confirmation dialog
- **THEN** no store state is modified

### Requirement: Import applies a per-layer validation policy

The system SHALL prepare imported snapshot JSON through the data-portability pipeline. Envelope failures and current snapshot payload failures SHALL reject the whole import. Repairable cross-reference failures SHALL be normalized before commit and returned as warnings. Prepared imports SHALL be committed all-or-nothing; the app SHALL NOT partially apply valid snapshot sections when another current snapshot section is invalid.

#### Scenario: Current import with a malformed task is rejected

- **WHEN** a user imports a current snapshot containing 10 valid tasks and 1 task missing its `id`
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with duplicate ids is rejected

- **WHEN** a user imports a current snapshot whose tasks or groups contain duplicate `id` values
- **THEN** preparation returns `{ ok: false, reason: <message> }`
- **AND** no task, group, timer, or planner data is committed

#### Scenario: Current import with a dangling groupId is normalized

- **WHEN** a user imports a current snapshot where task T points at group G that does not exist
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** task T is prepared with `groupId: DEFAULT_GROUP_ID`
- **AND** `warnings` notes the dangling reference
- **AND** no store state is modified until the prepared snapshot is committed

#### Scenario: Current import missing default group is normalized

- **WHEN** a user imports a current snapshot whose groups do not include the canonical default group
- **THEN** preparation returns `{ ok: true, snapshot: <prepared snapshot>, warnings: [...] }`
- **AND** the prepared snapshot includes a valid default group
- **AND** `warnings` notes that the default group was restored

#### Scenario: Envelope failure rejects the import

- **WHEN** a user imports a JSON file missing the `version` field
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no store state is modified
