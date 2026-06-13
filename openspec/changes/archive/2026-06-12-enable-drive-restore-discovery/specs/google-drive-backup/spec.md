## MODIFIED Requirements

### Requirement: User can restore manually from Google Drive

The system SHALL allow a connected user to restore canonical save snapshot data from Google Drive on demand, including on a browser or device that has not performed a backup locally. The restore SHALL require explicit user confirmation before downloading the file, preserving the current cancellation behavior. After confirmation, restore SHALL download the visible Drive file identified by `dayboxFileId` when available. If `dayboxFileId` is missing, restore SHALL list the user's My Drive root and find an accessible non-trashed `daybox.json` by name, then store the discovered file id as the current visible root backup id. The downloaded content SHALL be passed through `prepareSnapshotImport` from `@/features/data-portability`, and the prepared snapshot SHALL be committed through `commitSnapshotImport` only when preparation succeeds.

#### Scenario: Restore proceeds with stored file id

- **WHEN** a connected user has a local visible root `dayboxFileId`, clicks "Restore", and confirms the replacement in the AlertDialog
- **THEN** the file is downloaded from Drive by id
- **AND** the content is prepared by `prepareSnapshotImport`
- **AND** on a successful preparation, `commitSnapshotImport` writes the prepared snapshot to the restorable stores
- **AND** any preparation warnings are surfaced to the user
- **AND** the panel returns to its connected state showing the existing `lastBackupAt` because restore does not update the backup timestamp

#### Scenario: Restore discovers backup on a new device

- **WHEN** a connected user has no local `dayboxFileId`, clicks "Restore", and confirms the replacement in the AlertDialog
- **AND** an accessible non-trashed root file named `daybox.json` exists on Google Drive
- **THEN** the file is discovered and downloaded from Drive
- **AND** the discovered file id is stored as the current visible root backup id
- **AND** the content is prepared and committed through the data-portability restore pipeline
- **AND** any preparation warnings are surfaced to the user

#### Scenario: Restore surfaces a missing-file error

- **WHEN** a connected user clicks "Restore", confirms replacement, and no accessible visible root backup file exists on Drive
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

### Requirement: Panel displays connection state, account email, and last backup time

The system SHALL show in the Google Drive section of the settings drawer: the connection state (disconnected / connected), the account email when connected, that backups are stored as a visible `daybox.json` file in the user's Google Drive root, that Restore can search Google Drive root for `daybox.json`, and the `lastBackupAt` timestamp as a human-readable relative duration (e.g. "2 days ago") when a backup has been performed. These displays are informational only and do not nag or prompt the user to act.

#### Scenario: Disconnected panel

- **WHEN** the user is not connected
- **THEN** the panel shows a single "Connect with Google" button and a short description that the backup will be a visible `daybox.json` file in Google Drive root
- **AND** no email, no last-backup time, and no other state is shown

#### Scenario: Connected panel after a successful backup

- **WHEN** the user is connected and has performed at least one backup
- **THEN** the panel shows the account email and "Last backup: 2 days ago" (or equivalent)
- **AND** the panel communicates that the backup file is visible in Google Drive root as `daybox.json`
- **AND** the Back up and Restore buttons are enabled
- **AND** the Disconnect button is available

#### Scenario: Connected panel before any local backup

- **WHEN** the user is connected but this browser has never backed up
- **THEN** the panel shows the account email but no "Last backup" line
- **AND** the panel communicates that backing up will create a visible `daybox.json` file in Google Drive root
- **AND** the panel communicates that restoring will search Google Drive root for `daybox.json`
- **AND** the Back up button is enabled
- **AND** the Restore button is enabled
