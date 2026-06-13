## Purpose

Define the manual, opt-in Google Drive backup feature for DayBox: connect, manual backup, manual restore, disconnect, and the panel that surfaces the account email, last-backup timestamp, and failure modes. The snapshot/restore mechanics are owned by the `data-portability` capability; this capability only governs the Google Drive integration (transport, OAuth flow, persisted auth, panel UI).

## Requirements

### Requirement: User can connect to Google Drive

The system SHALL allow the user to initiate a Google OAuth flow from the settings drawer. The flow SHALL use Google Identity Services loaded as a script (no npm dependency), SHALL request the `https://www.googleapis.com/auth/drive.file` scope for app-created visible Drive files, and SHALL persist the resulting access token, its expiry, and the account's email under `daybox-google-drive` via `createValidatedRehydrate`. The OAuth Web Client ID SHALL be read from the `VITE_GOOGLE_CLIENT_ID` env var at build time.

#### Scenario: User connects for the first time

- **WHEN** the user opens the settings drawer and clicks "Connect with Google" in the Google Drive section
- **THEN** a Google consent popup opens
- **AND** after the user grants permission, the access token, its expiry, and the account email are written to `daybox-google-drive`
- **AND** the panel re-renders in the connected state showing the account email and the Back up / Restore / Disconnect controls

#### Scenario: User denies the consent prompt

- **WHEN** the user closes the consent popup without granting permission
- **THEN** no token is written to the store
- **AND** the panel remains in the disconnected state
- **AND** no error message is shown (denial is a normal outcome, not a failure)

#### Scenario: The client ID env var is missing

- **WHEN** `VITE_GOOGLE_CLIENT_ID` is not set at build time
- **THEN** the panel shows an inline "Google Drive is not configured for this build" message
- **AND** the Connect button is disabled
- **AND** the rest of the app continues to function normally — the file-based Export/Import is unaffected

### Requirement: User can disconnect from Google Drive

The system SHALL allow the user to disconnect at any time from the connected state. Disconnecting SHALL clear the access token, expiry, account email, and `dayboxFileId` from the persisted `daybox-google-drive` state, returning the panel to the disconnected state. Disconnecting SHALL NOT delete the file on Drive — the user's data on Drive is theirs to keep.

#### Scenario: User disconnects

- **WHEN** the user clicks "Disconnect" in the connected panel
- **THEN** the `daybox-google-drive` persisted state is cleared
- **AND** the panel re-renders in the disconnected state with the Connect button
- **AND** the file on Google Drive is untouched

### Requirement: User can back up manually to Google Drive

The system SHALL allow a connected user to back up all canonical save snapshot data to Google Drive on demand. The backup SHALL call `buildSnapshot` from `@/modules/data-portability` and SHALL write the resulting JSON as a single visible file named `daybox.json` in the user's My Drive root, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing visible file when possible, not create a duplicate. Google Drive backup SHALL use the same snapshot contract as file Export, including timer settings and excluding timer runtime state and theme.

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

#### Scenario: Backup fails on token expiry

- **WHEN** the access token has expired and the user clicks "Back up"
- **THEN** the system silently re-prompts for authorisation
- **AND** after the user re-grants permission, the backup proceeds with the new token
- **AND** the user does not see an error message about token expiry

### Requirement: User can restore manually from Google Drive

The system SHALL allow a connected user to restore canonical save snapshot data from Google Drive on demand, including on a browser or device that has not performed a backup locally. The restore SHALL require explicit user confirmation before downloading the file, preserving the current cancellation behavior. After confirmation, restore SHALL download the visible Drive file identified by `dayboxFileId` when available. If `dayboxFileId` is missing, restore SHALL list the user's My Drive root and find an accessible non-trashed `daybox.json` by name, then store the discovered file id as the current visible root backup id. The downloaded content SHALL be passed through `prepareSnapshotImport` from `@/modules/data-portability`, and the prepared snapshot SHALL be committed through `commitSnapshotImport` only when preparation succeeds.

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

#### Scenario: Connected panel before any backup

- **WHEN** the user is connected but this browser has never backed up
- **THEN** the panel shows the account email but no "Last backup" line
- **AND** the panel communicates that backing up will create a visible `daybox.json` file in Google Drive root
- **AND** the panel communicates that restoring will search Google Drive root for `daybox.json`
- **AND** the Back up button is enabled
- **AND** the Restore button is enabled

### Requirement: The feature uses the data-portability feature for its data round-trip

The feature SHALL NOT re-implement current save envelope parsing, legacy adapters, slice preparation orchestration, normalization, or commit behavior. It SHALL call `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport` from `@/modules/data-portability` for the snapshot round-trip. If the feature ever needs to surface a file-based Export flow, it SHALL import the generic browser download helper from `@/shared/utils/download`, not from data-portability. The feature SHALL NOT import from `src/app/*` and SHALL NOT import individual feature stores for the purpose of building or restoring the app snapshot.

#### Scenario: The feature builds a backup via data-portability

- **WHEN** the feature's `store.ts` runs a backup action
- **THEN** it calls `buildSnapshot()` from `@/modules/data-portability`
- **AND** it serialises the returned object with `JSON.stringify`
- **AND** it uploads the resulting string to Drive
- **AND** the feature does not import `useTaskStore`, `useGroupStore`, `useTimerStore`, or `usePlannerStore` for the purpose of building the snapshot because that wiring is owned by data-portability

#### Scenario: The feature restores via data-portability

- **WHEN** the feature's `store.ts` runs a restore action after user confirmation
- **THEN** the downloaded JSON string is passed to `prepareSnapshotImport` from `@/modules/data-portability`
- **AND** a successful preparation result is passed to `commitSnapshotImport` from the same feature
- **AND** preparation warnings are surfaced to the user (e.g. dangling group references or restored default group)
- **AND** the file-based Import button in the settings drawer and the Google Drive Restore button share the same prepare/commit code path through data-portability
