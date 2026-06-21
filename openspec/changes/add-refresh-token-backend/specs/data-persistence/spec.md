## ADDED Requirements

### Requirement: Google Drive persistence slice holds only Drive-file metadata

The `daybox-google-drive` persisted slice SHALL contain only the `dayboxFileId`, `backupFileSpace`, and `lastBackupAt` fields — the metadata that identifies the user's backup file on Drive and the last backup timestamp. The slice SHALL NOT persist the Google OAuth access token, access-token expiry, or account email; those concerns are owned by the `oauth-backend` capability (refresh token in an HttpOnly cookie) and the SPA's non-persisted runtime state (access token in memory). The access token and expiry SHALL be kept in non-persisted runtime state of the Google Drive store and SHALL NEVER be written to localStorage.

#### Scenario: Access token is not persisted

- **WHEN** the Google Drive store obtains a fresh access token from `/api/auth/refresh`
- **THEN** the token is stored in the store's non-persisted runtime state
- **AND** `localStorage.getItem('daybox-google-drive')` does not contain the access token
- **AND** the token is cleared on the next page load

#### Scenario: Drive-file metadata persists across reloads

- **WHEN** the user backs up successfully and reloads the page
- **THEN** `localStorage.getItem('daybox-google-drive')` contains `dayboxFileId`, `backupFileSpace`, and `lastBackupAt`
- **AND** the next backup reuses the persisted `dayboxFileId` to update the existing file rather than creating a duplicate

### Requirement: Google Drive persistence migrates from version 1 to version 2

The `daybox-google-drive` persistence version SHALL be `2`. The migrate function SHALL clear the legacy implicit-flow fields `accessToken`, `expiresAt`, and `email` from any persisted state carried over from version 1, while preserving `dayboxFileId`, `backupFileSpace`, and `lastBackupAt`. This ensures that users who connected under the old GIS implicit flow do not carry stale access tokens or emails into the new server-backed flow; their remembered Drive-file metadata survives so the one-time reconnect reuses the existing `daybox.json` file rather than creating a duplicate.

#### Scenario: Legacy v1 state with access token and file id migrates cleanly

- **WHEN** the persisted blob for `daybox-google-drive` has version 1 and contains `{ accessToken: "ya29.old", expiresAt: 12345, email: "u@x", dayboxFileId: "file-1", backupFileSpace: "drive-root", lastBackupAt: "2026-06-01T00:00:00Z" }`
- **THEN** the migrate function returns a state with version 2
- **AND** the returned state has `accessToken: undefined`, `expiresAt: undefined`, and `email: undefined`
- **AND** the returned state preserves `dayboxFileId: "file-1"`, `backupFileSpace: "drive-root"`, and `lastBackupAt: "2026-06-01T00:00:00Z"`

#### Scenario: Fresh install with no persisted blob defaults to empty metadata

- **WHEN** the persisted blob for `daybox-google-drive` is empty or missing
- **THEN** the rehydrated state has no `dayboxFileId`, no `backupFileSpace`, and no `lastBackupAt`
- **AND** the store treats the user as not-yet-backed-up (connected status is owned by the oauth-backend cookie, not by this slice)
