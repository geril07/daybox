## Purpose

Define the manual, opt-in Google Drive backup feature for DayBox: connect, manual backup, manual restore, disconnect, and the panel that surfaces the account email, last-backup timestamp, and failure modes. The snapshot/restore mechanics are owned by the `data-portability` capability; this capability only governs the Google Drive integration (transport, OAuth flow, persisted auth, panel UI).

## Requirements

### Requirement: User can connect to Google Drive

The system SHALL allow the user to initiate a Google OAuth flow from the settings drawer. The flow SHALL use Google Identity Services loaded as a script (no npm dependency), SHALL request the `https://www.googleapis.com/auth/drive.appdata` scope (which grants access only to the app's hidden appDataFolder), and SHALL persist the resulting access token, its expiry, and the account's email under `daybox-google-drive` via `createValidatedPersist`. The OAuth Web Client ID SHALL be read from the `VITE_GOOGLE_CLIENT_ID` env var at build time.

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

The system SHALL allow a connected user to back up all app data (tasks, groups, timer settings, planner preferences) to Google Drive on demand. The backup SHALL call `buildSnapshot` from `@/features/data-portability` and SHALL write the resulting JSON as a single file named `daybox.json` in the user's appDataFolder, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing file (not create a new one). The theme is intentionally NOT included in the backup — each device keeps its own theme preference.

#### Scenario: First backup creates the file

- **WHEN** a connected user clicks "Back up" and no prior backup file exists
- **THEN** a new file named `daybox.json` is created in the user's appDataFolder
- **AND** the file content is the v3 envelope produced by `buildSnapshot` from `@/features/data-portability` (tasks, groups, timer, planner, exportedAt, version: 3 — no theme field)
- **AND** the new file id is stored in `dayboxFileId`
- **AND** `lastBackupAt` is set to the current time
- **AND** the panel re-renders showing the new "Last backup" timestamp

#### Scenario: Subsequent backup updates the existing file

- **WHEN** a connected user clicks "Back up" and `dayboxFileId` is already set
- **THEN** the existing file on Drive is replaced with the new v3 envelope
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

The system SHALL allow a connected user to restore all app data from Google Drive on demand. The restore SHALL download the file identified by `dayboxFileId` (or, if `dayboxFileId` is missing, list the appDataFolder and find `daybox.json` by name), SHALL pass the content through the same `parseImport` validator used by the file-based Import, and SHALL apply the result through the same `applyImport` flow. A restore SHALL NOT modify local state without a confirmation dialog matching the current file-based Import behaviour — the user must explicitly confirm that current local data will be replaced.

#### Scenario: Restore proceeds with confirmation

- **WHEN** a connected user clicks "Restore" and confirms the replacement in the AlertDialog
- **THEN** the file is downloaded from Drive
- **AND** the content is validated by `parseImport`
- **AND** on a successful parse, `applyImport` writes to the five persisted stores
- **AND** the panel returns to its connected state showing the existing `lastBackupAt` (the restore does not update the backup timestamp)

#### Scenario: Restore surfaces a missing-file error

- **WHEN** a connected user clicks "Restore" and no backup file exists on Drive
- **THEN** an inline "No backup found" message is shown
- **AND** no local state is modified
- **AND** the panel remains in its current state

#### Scenario: Restore surfaces an invalid-envelope error

- **WHEN** a connected user clicks "Restore" and the file on Drive fails v3 validation
- **THEN** the same error string that the file-based Import would show is displayed inline
- **AND** no local state is modified

#### Scenario: Restore is cancelled

- **WHEN** a connected user clicks "Restore" and then clicks "Cancel" in the confirmation dialog
- **THEN** no download is performed
- **AND** no local state is modified
- **AND** the panel returns to its current state

### Requirement: Panel displays connection state, account email, and last backup time

The system SHALL show in the Google Drive section of the settings drawer: the connection state (disconnected / connected), the account email when connected, and the `lastBackupAt` timestamp as a human-readable relative duration (e.g. "2 days ago") when a backup has been performed. These displays are informational only and do not nag or prompt the user to act.

#### Scenario: Disconnected panel

- **WHEN** the user is not connected
- **THEN** the panel shows a single "Connect with Google" button and a short description
- **AND** no email, no last-backup time, and no other state is shown

#### Scenario: Connected panel after a successful backup

- **WHEN** the user is connected and has performed at least one backup
- **THEN** the panel shows the account email and "Last backup: 2 days ago" (or equivalent)
- **AND** the Back up and Restore buttons are enabled
- **AND** the Disconnect button is available

#### Scenario: Connected panel before any backup

- **WHEN** the user is connected but has never backed up
- **THEN** the panel shows the account email but no "Last backup" line
- **AND** the Back up button is enabled
- **AND** the Restore button is disabled with a tooltip or hint that no backup exists yet

### Requirement: The feature uses the data-portability feature for its data round-trip

The feature SHALL NOT re-implement the v3 envelope parsing, the version migrations, the per-slice validation, or the cross-reference checks. It SHALL call `buildSnapshot`, `validateSnapshot`, and `applySnapshot` from `@/features/data-portability` for the snapshot round-trip, and SHALL use `downloadAsFile` from the same feature for the file-based Export flow (if it ever needs to surface one). The feature SHALL NOT import from `src/app/*` and SHALL NOT re-implement the slice interface for itself — it consumes slices only through the data-portability public surface.

#### Scenario: The feature builds a backup via data-portability

- **WHEN** the feature's `store.ts` runs a backup action
- **THEN** it calls `buildSnapshot()` from `@/features/data-portability`
- **AND** it serialises the returned object with `JSON.stringify`
- **AND** it uploads the resulting string to Drive
- **AND** the feature does not import `useTaskStore`, `useGroupStore`, `useTimerStore`, or `usePlannerStore` for the purpose of building the snapshot — that wiring is owned by data-portability and each feature's slice

#### Scenario: The feature restores via data-portability

- **WHEN** the feature's `store.ts` runs a restore action
- **THEN** the downloaded JSON string is passed to `validateSnapshot` from `@/features/data-portability`
- **AND** a successful parse result is passed to `applySnapshot` from the same feature
- **AND** the apply result's `warnings` are surfaced to the user (e.g. dropped fields, dangling group references)
- **AND** the file-based Import button in the settings drawer and the Google Drive Restore button share the same `validateSnapshot` and `applySnapshot` code path through data-portability
