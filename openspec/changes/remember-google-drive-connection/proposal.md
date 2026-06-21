## Why

The Google Drive panel currently treats an expired browser access token as a disconnected state, even though the Google Identity Services token client can often obtain a new short-lived access token silently when the user takes an action. This makes the UI more fragile than the actual authorization model and can hide backup/restore controls from users who previously connected Drive.

## What Changes

- Separate remembered Google Drive connection state from fresh access-token state.
- Keep the Google Drive panel in the connected state when DayBox has remembered account/Drive connection metadata, even if the stored access token has expired.
- Reacquire a short-lived access token through Google Identity Services when the user clicks Back up or Restore and the stored token is missing, expired, or close to expiry.
- Load Google Identity Services before token reacquisition for backup and restore paths, not only during the initial Connect path.
- Surface a normal reconnect/authorization outcome if silent token reacquisition fails, without introducing browser-stored refresh tokens.
- Preserve Disconnect as the explicit action that clears remembered Google Drive connection metadata.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `google-drive-backup`: Refine connection-state and expired-token behavior for the existing Google Drive backup panel and manual backup/restore actions.

## Impact

- Affected code: `src/modules/google-drive/queries.ts`, `src/modules/google-drive/store.ts`, `src/modules/google-drive/components/GoogleDrivePanel.tsx`, and related tests.
- Affected persistence: existing `daybox-google-drive` state remains localStorage-backed; no refresh token is introduced.
- Affected OAuth behavior: continues using Google Identity Services token client and the `drive.file` scope.
- No new runtime dependencies, backend service, or OAuth offline-access flow.
