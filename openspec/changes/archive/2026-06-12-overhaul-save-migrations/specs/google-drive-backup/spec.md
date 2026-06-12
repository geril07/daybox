## MODIFIED Requirements

### Requirement: User can back up manually to Google Drive

The system SHALL allow a connected user to back up all canonical save snapshot data to Google Drive on demand. The backup SHALL call `buildSnapshot` from `@/features/data-portability` and SHALL write the resulting JSON as a single file named `daybox.json` in the user's appDataFolder, SHALL store the resulting Drive file id in the persisted `dayboxFileId` field, and SHALL update the `lastBackupAt` timestamp. Subsequent backups SHALL update the existing file (not create a new one). Google Drive backup SHALL use the same snapshot contract as file Export, including timer settings and excluding timer runtime state and theme.

#### Scenario: First backup creates the file

- **WHEN** a connected user clicks "Back up" and no prior backup file exists
- **THEN** a new file named `daybox.json` is created in the user's appDataFolder
- **AND** the file content is the current envelope produced by `buildSnapshot` from `@/features/data-portability`
- **AND** the content includes `envelopeVersion`, `exportedAt`, and `slices`
- **AND** the `slices` object includes `tasks`, `groups`, `timerSettings`, and `planner`
- **AND** the content does not include top-level `timer`, timer runtime fields, or `theme`
- **AND** the new file id is stored in `dayboxFileId`
- **AND** `lastBackupAt` is set to the current time
- **AND** the panel re-renders showing the new "Last backup" timestamp

### Requirement: User can restore manually from Google Drive

The system SHALL allow a connected user to restore canonical save snapshot data from Google Drive on demand. The restore SHALL require explicit user confirmation before downloading the file, preserving the current cancellation behavior. After confirmation, restore SHALL download the file identified by `dayboxFileId` (or, if `dayboxFileId` is missing, list the appDataFolder and find `daybox.json` by name), pass the content through `prepareSnapshotImport` from `@/features/data-portability`, and commit the prepared snapshot through `commitSnapshotImport` only when preparation succeeds.

#### Scenario: Restore proceeds with confirmation

- **WHEN** a connected user clicks "Restore" and confirms the replacement in the AlertDialog
- **THEN** the file is downloaded from Drive
- **AND** the content is prepared by `prepareSnapshotImport`
- **AND** on a successful preparation, `commitSnapshotImport` writes the prepared snapshot to the restorable stores
- **AND** any preparation warnings are surfaced to the user
- **AND** the panel returns to its connected state showing the existing `lastBackupAt` because restore does not update the backup timestamp

### Requirement: The feature uses the data-portability feature for its data round-trip

The feature SHALL NOT re-implement current save envelope parsing, legacy adapters, slice preparation orchestration, normalization, or commit behavior. It SHALL call `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport` from `@/features/data-portability` for the snapshot round-trip. If the feature ever needs to surface a file-based Export flow, it SHALL import the generic browser download helper from `@/shared/utils/download`, not from data-portability. The feature SHALL NOT import from `src/app/*` and SHALL NOT import individual feature stores for the purpose of building or restoring the app snapshot.

#### Scenario: The feature builds a backup via data-portability

- **WHEN** the feature's `store.ts` runs a backup action
- **THEN** it calls `buildSnapshot()` from `@/features/data-portability`
- **AND** it serialises the returned object with `JSON.stringify`
- **AND** it uploads the resulting string to Drive
- **AND** the feature does not import `useTaskStore`, `useGroupStore`, `useTimerStore`, or `usePlannerStore` for the purpose of building the snapshot because that wiring is owned by data-portability
