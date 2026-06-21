## MODIFIED Requirements

### Requirement: User can back up manually to Google Drive

The system SHALL allow a connected user to back up all canonical save snapshot data to Google Drive on demand. The system SHALL require explicit user confirmation before performing the backup. Upon confirmation, the backup SHALL call `buildSnapshot` from `@/modules/data-portability` and SHALL write the resulting JSON as a single visible file named `daybox.json` in the user's My Drive root, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing visible file when possible, not create a duplicate. Google Drive backup SHALL use the same snapshot contract as file Export, including timer settings and excluding timer runtime state and theme.

#### Scenario: User confirms backup

- **WHEN** a connected user clicks "Back up"
- **THEN** a confirmation dialog is shown with the option to proceed or cancel
- **AND** the dialog communicates that the local snapshot will overwrite the cloud backup

#### Scenario: User cancels backup

- **WHEN** a connected user clicks "Back up" and then clicks "Cancel" in the confirmation dialog
- **THEN** no backup is performed
- **AND** no local state is modified
- **AND** the panel remains in its current state

#### Scenario: First backup creates the file

- **WHEN** a connected user clicks "Back up", confirms the dialog, and no prior visible root backup file exists
- **THEN** a new visible file named `daybox.json` is created in the user's My Drive root
- **AND** the file content is the current envelope produced by `buildSnapshot` from `@/modules/data-portability`
- **AND** the content includes `envelopeVersion`, `exportedAt`, and `slices`
- **AND** the `slices` object includes `tasks`, `groups`, `timerSettings`, and `planner`
- **AND** the content does not include top-level `timer`, timer runtime fields, or `theme`
- **AND** the new file id is stored in `dayboxFileId`
- **AND** `lastBackupAt` is set to the current time
- **AND** the panel re-renders showing the new "Last backup" timestamp

#### Scenario: Subsequent backup updates the existing file

- **WHEN** a connected user clicks "Back up", confirms the dialog, and `dayboxFileId` identifies an accessible visible Drive file
- **THEN** the existing file on Drive is replaced with the new current snapshot
- **AND** `lastBackupAt` is updated
- **AND** the file name and id are unchanged

#### Scenario: Backup fails on network error

- **WHEN** the user confirms the backup dialog and the network request fails
- **THEN** an inline error message is shown in the panel
- **AND** `lastBackupAt` is NOT updated
- **AND** `dayboxFileId` is NOT changed
- **AND** the panel returns to its previous state once the user dismisses the error

#### Scenario: Backup fails on token expiry

- **WHEN** the access token has expired and the user confirms the backup dialog
- **THEN** the system silently re-prompts for authorisation
- **AND** after the user re-grants permission, the backup proceeds with the new token
- **AND** the user does not see an error message about token expiry
