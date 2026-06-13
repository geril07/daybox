## MODIFIED Requirements

### Requirement: User can import data from JSON

The system SHALL allow users to upload a previously exported current-envelope JSON file to restore save snapshot data into the owning stores. The import MUST accept the current nested envelope with `envelopeVersion: 1`, `exportedAt`, and `slices`. Import preparation SHALL parse the envelope, prepare every registered feature slice, normalize cross-slice invariants without mutating stores, and commit only after preparation succeeds and the user confirms replacement. Flat legacy JSON files with top-level `version: 2` or `version: 3` SHALL be rejected.

#### Scenario: Import current data

- **WHEN** user selects a current-envelope JSON file via the "Import" button in settings
- **THEN** the file is prepared through data-portability without mutating stores
- **AND** after the user confirms replacement, tasks, groups, timer settings, and planner preferences are replaced with the prepared snapshot data
- **AND** theme is left unchanged

#### Scenario: Import flat legacy data is rejected

- **WHEN** user selects a flat `version: 2` or `version: 3` JSON file via the "Import" button in settings
- **THEN** preparation fails with `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no confirmation dialog is shown for committing that file
- **AND** no store state is modified

#### Scenario: Import confirms before committing

- **WHEN** user clicks "Import"
- **THEN** a confirmation dialog warns that current data will be replaced

#### Scenario: Import cancellation preserves local data

- **WHEN** user selects a JSON file that prepares successfully and then cancels the confirmation dialog
- **THEN** no store state is modified

### Requirement: Import applies a per-layer validation policy

The system SHALL prepare imported snapshot JSON through the data-portability pipeline. Envelope failures and current slice payload failures SHALL reject the whole import. Repairable cross-reference failures SHALL be normalized before commit and returned as warnings. Prepared imports SHALL be committed all-or-nothing; the app SHALL NOT partially apply valid snapshot sections when another current snapshot section is invalid.

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

- **WHEN** a user imports a JSON file missing current `envelopeVersion: 1`
- **THEN** the result is `{ ok: false, reason: 'Not a DayBox export file.' }`
- **AND** no store state is modified
