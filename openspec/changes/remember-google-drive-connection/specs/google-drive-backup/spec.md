## MODIFIED Requirements

### Requirement: User can back up manually to Google Drive

The system SHALL allow a connected user to back up all canonical save snapshot data to Google Drive on demand. The backup SHALL call `buildSnapshot` from `@/modules/data-portability` and SHALL write the resulting JSON as a single visible file named `daybox.json` in the user's My Drive root, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing visible file when possible, not create a duplicate. Google Drive backup SHALL use the same snapshot contract as file Export, including timer settings and excluding timer runtime state and theme. If the stored access token is missing, expired, or close to expiry, the backup action SHALL load Google Identity Services when needed and request a new short-lived access token through the GIS token client before calling Drive APIs.

#### Scenario: First backup creates the file

- **WHEN** a connected user clicks "Back up" and no prior visible root backup file exists
- **THEN** a new visible file named `daybox.json` is created in the user's My Drive root
- **AND** the file content is the current envelope produced by `buildSnapshot` from `@/modules/data-portability`
- **AND** the content includes `envelopeVersion`, `exportedAt`, and `slices`
- **AND** the `slices` object includes `tasks`, `groups`, `timerSettings`, and `planner`
- **AND** the content does not include top-level `timer`, timer runtime fields, or `theme`
- **AND** the new file id is stored in `dayboxFileId`
- **AND** `lastBackupAt` is set to the current time
- **AND** the panel re-renders showing the new "Last backup" timestamp

#### Scenario: Subsequent backup updates the existing file

- **WHEN** a connected user clicks "Back up" and `dayboxFileId` identifies an accessible visible Drive file
- **THEN** the existing file on Drive is replaced with the new current snapshot
- **AND** `lastBackupAt` is updated
- **AND** the file name and id are unchanged

#### Scenario: Backup fails on network error

- **WHEN** the user clicks "Back up" and the network request fails
- **THEN** an inline error message is shown in the panel
- **AND** `lastBackupAt` is NOT updated
- **AND** `dayboxFileId` is NOT changed
- **AND** the panel returns to its previous state once the user dismisses the error

#### Scenario: Backup reacquires an expired access token

- **WHEN** the user is connected, the access token has expired, and the user clicks "Back up"
- **THEN** the system loads Google Identity Services when needed
- **AND** the system requests a new short-lived access token through the GIS token client
- **AND** after a token is returned, the backup proceeds with the new token
- **AND** the user does not see an error message about token expiry

#### Scenario: Backup cannot silently reacquire a token

- **WHEN** the user is connected, the access token has expired, and GIS cannot return a new token without user interaction
- **THEN** the backup is not performed
- **AND** an inline authorization/reconnect message is shown in the panel
- **AND** remembered Google Drive metadata such as account email, file id, and last-backup timestamp is NOT cleared
- **AND** the panel remains in the connected state until the user explicitly disconnects

### Requirement: User can restore manually from Google Drive

The system SHALL allow a connected user to restore canonical save snapshot data from Google Drive on demand, including on a browser or device that has not performed a backup locally. The restore SHALL require explicit user confirmation before downloading the file, preserving the current cancellation behavior. After confirmation, restore SHALL download the visible Drive file identified by `dayboxFileId` when available. If `dayboxFileId` is missing, restore SHALL list the user's My Drive root and find an accessible non-trashed `daybox.json` by name, then store the discovered file id as the current visible root backup id. The downloaded content SHALL be passed through `prepareSnapshotImport` from `@/modules/data-portability`, and the prepared snapshot SHALL be committed through `commitSnapshotImport` only when preparation succeeds. If the stored access token is missing, expired, or close to expiry, the restore action SHALL load Google Identity Services when needed and request a new short-lived access token through the GIS token client before calling Drive APIs.

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

- **WHEN** a connected user clicks "Restore" and no accessible visible root backup file exists on Drive
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

#### Scenario: Restore reacquires an expired access token

- **WHEN** the user is connected, the access token has expired, and the user confirms Restore
- **THEN** the system loads Google Identity Services when needed
- **AND** the system requests a new short-lived access token through the GIS token client
- **AND** after a token is returned, restore proceeds with the new token
- **AND** the user does not see an error message about token expiry

#### Scenario: Restore cannot silently reacquire a token

- **WHEN** the user is connected, the access token has expired, the user confirms Restore, and GIS cannot return a new token without user interaction
- **THEN** the restore is not performed
- **AND** no local state is modified
- **AND** an inline authorization/reconnect message is shown in the panel
- **AND** remembered Google Drive metadata such as account email, file id, and last-backup timestamp is NOT cleared
- **AND** the panel remains in the connected state until the user explicitly disconnects

### Requirement: Panel displays connection state, account email, and last backup time

The system SHALL show in the Google Drive section of the settings drawer: the connection state (disconnected / connected), the account email when connected, that backups are stored as a visible `daybox.json` file in the user's Google Drive root, that Restore can search Google Drive root for `daybox.json`, and the `lastBackupAt` timestamp as a human-readable relative duration (e.g. "2 days ago") when a backup has been performed. Connected state SHALL be based on remembered Google Drive connection metadata rather than requiring a currently fresh access token. These displays are informational only and do not nag or prompt the user to act.

#### Scenario: Disconnected panel

- **WHEN** the user has no remembered Google Drive connection metadata
- **THEN** the panel shows a single "Connect with Google" button and a short description that the backup will be a visible `daybox.json` file in Google Drive root
- **AND** no email, no last-backup time, and no other state is shown

#### Scenario: Connected panel after a successful backup

- **WHEN** the user is connected and has performed at least one backup
- **THEN** the panel shows the account email and "Last backup: 2 days ago" (or equivalent)
- **AND** the panel communicates that the backup file is visible in Google Drive root as `daybox.json`
- **AND** the Back up and Restore buttons are enabled
- **AND** the Disconnect button is available

#### Scenario: Connected panel before any backup

- **WHEN** the user is connected but this browser has never backed up
- **THEN** the panel shows the account email but no "Last backup" line
- **AND** the panel communicates that backing up will create a visible `daybox.json` file in Google Drive root
- **AND** the panel communicates that restoring will search Google Drive root for `daybox.json`
- **AND** the Back up button is enabled
- **AND** the Restore button is enabled

#### Scenario: Connected panel with expired access token

- **WHEN** the user has remembered Google Drive connection metadata and the stored access token is expired
- **THEN** the panel remains in the connected state
- **AND** the panel shows available remembered account and backup metadata
- **AND** the Back up and Restore buttons remain available
- **AND** the panel does not show the disconnected Connect button solely because the access token expired
