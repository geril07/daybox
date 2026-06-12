## MODIFIED Requirements

### Requirement: User can back up manually to Google Drive

The system SHALL allow a connected user to back up all restorable snapshot data (tasks, groups, timer settings, planner preferences) to Google Drive on demand. The backup SHALL call `buildSnapshot` from `@/features/data-portability` and SHALL write the resulting JSON as a single file named `daybox.json` in the user's appDataFolder, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing file (not create a new one). The theme is intentionally NOT included in the backup because each device keeps its own theme preference.

#### Scenario: First backup creates the file

- **WHEN** a connected user clicks "Back up" and no prior backup file exists
- **THEN** a new file named `daybox.json` is created in the user's appDataFolder
- **AND** the file content is the current snapshot produced by `buildSnapshot` from `@/features/data-portability` (tasks, groups, timer, planner, exportedAt, current version, no theme field)
- **AND** the new file id is stored in `dayboxFileId`
- **AND** `lastBackupAt` is set to the current time
- **AND** the panel re-renders showing the new "Last backup" timestamp

#### Scenario: Subsequent backup updates the existing file

- **WHEN** a connected user clicks "Back up" and `dayboxFileId` is already set
- **THEN** the existing file on Drive is replaced with the new current snapshot
- **AND** `lastBackupAt` is updated
- **AND** the file name and id are unchanged

#### Scenario: Backup fails on network error

- **WHEN** the user clicks "Back up" and the network request fails
- **THEN** an inline error message is shown in the panel
- **AND** `lastBackupAt` is NOT updated
- **AND** `dayboxFileId` is NOT changed
- **AND** the panel returns to its previous state once the user dismisses the error

#### Scenario: Backup fails on token expiry

- **WHEN** the access token has expired and the user clicks "Back up"
- **THEN** the system silently re-prompts for authorisation
- **AND** after the user re-grants permission, the backup proceeds with the new token
- **AND** the user does not see an error message about token expiry

### Requirement: User can restore manually from Google Drive

The system SHALL allow a connected user to restore all restorable snapshot data from Google Drive on demand. The restore SHALL require explicit user confirmation before downloading the file, preserving the current cancellation behavior. After confirmation, restore SHALL download the file identified by `dayboxFileId` (or, if `dayboxFileId` is missing, list the appDataFolder and find `daybox.json` by name), pass the content through `prepareSnapshotImport` from `@/features/data-portability`, and commit the prepared snapshot through `commitSnapshotImport` only when preparation succeeds.

#### Scenario: Restore proceeds with confirmation

- **WHEN** a connected user clicks "Restore" and confirms the replacement in the AlertDialog
- **THEN** the file is downloaded from Drive
- **AND** the content is prepared by `prepareSnapshotImport`
- **AND** on a successful preparation, `commitSnapshotImport` writes the prepared snapshot to the restorable stores
- **AND** any preparation warnings are surfaced to the user
- **AND** the panel returns to its connected state showing the existing `lastBackupAt` (the restore does not update the backup timestamp)

#### Scenario: Restore surfaces a missing-file error

- **WHEN** a connected user clicks "Restore" and no backup file exists on Drive
- **THEN** an inline "No backup found" message is shown
- **AND** no local state is modified
- **AND** the panel remains in its current state

#### Scenario: Restore surfaces an invalid-snapshot error

- **WHEN** a connected user clicks "Restore" and the file on Drive fails preparation
- **THEN** the same error string that the file-based Import would show is displayed inline
- **AND** no local state is modified

#### Scenario: Restore is cancelled

- **WHEN** a connected user clicks "Restore" and then clicks "Cancel" in the confirmation dialog
- **THEN** no download is performed
- **AND** no local state is modified
- **AND** the panel returns to its current state

### Requirement: The feature uses the data-portability feature for its data round-trip

The feature SHALL NOT re-implement current snapshot parsing, version migrations, normalization, or commit behavior. It SHALL call `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport` from `@/features/data-portability` for the snapshot round-trip. If the feature ever needs to surface a file-based Export flow, it SHALL import the generic browser download helper from `@/shared/utils/download`, not from data-portability. The feature SHALL NOT import from `src/app/*` and SHALL NOT import individual feature stores for the purpose of building or restoring the app snapshot.

#### Scenario: The feature builds a backup via data-portability

- **WHEN** the feature's `store.ts` runs a backup action
- **THEN** it calls `buildSnapshot()` from `@/features/data-portability`
- **AND** it serialises the returned object with `JSON.stringify`
- **AND** it uploads the resulting string to Drive
- **AND** the feature does not import `useTaskStore`, `useGroupStore`, `useTimerStore`, or `usePlannerStore` for the purpose of building the snapshot because that wiring is owned by data-portability

#### Scenario: The feature restores via data-portability

- **WHEN** the feature's `store.ts` runs a restore action after user confirmation
- **THEN** the downloaded JSON string is passed to `prepareSnapshotImport` from `@/features/data-portability`
- **AND** a successful preparation result is passed to `commitSnapshotImport` from the same feature
- **AND** preparation warnings are surfaced to the user (e.g. dangling group references or restored default group)
- **AND** the file-based Import button in the settings drawer and the Google Drive Restore button share the same prepare/commit code path through data-portability
