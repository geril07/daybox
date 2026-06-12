## Why

Google Drive backup currently stores `daybox.json` in the hidden Drive `appDataFolder`, which makes the backup opaque to users. Storing the backup as a normal file in the user's Drive root makes the data visible, understandable, and directly manageable without adding folder selection complexity.

## What Changes

- Change Google Drive backup storage from the hidden `appDataFolder` space to a visible `daybox.json` file in the user's My Drive root.
- Change the OAuth scope from `drive.appdata` to a visible-file scope suitable for app-created files, expected to be `https://www.googleapis.com/auth/drive.file`.
- Keep the manual backup and restore model: users still connect, click Back up, click Restore, and can disconnect.
- Keep using the existing data-portability snapshot contract for backup and restore.
- Preserve `dayboxFileId` persistence so subsequent backups update the same visible file when possible.
- When no stored file id is available, restore discovery searches for `daybox.json` in the Drive root instead of the app data folder.
- Do not migrate existing hidden `appDataFolder` backups automatically, because Drive files cannot move between the hidden app data space and the visible Drive space.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `google-drive-backup`: Change the transport storage location, OAuth scope, upload metadata, restore discovery, and panel copy from hidden `appDataFolder` backup to visible root `daybox.json` backup.

## Impact

- `openspec/specs/google-drive-backup/spec.md` requirements change.
- `src/shared/google-drive/client.ts` scope changes from `drive.appdata` to `drive.file`.
- `src/shared/google-drive/drive-api.ts` upload and search helpers change from `appDataFolder` to root-visible Drive files.
- `src/features/google-drive/store.ts` continues to call data-portability APIs but uses renamed/updated Drive helpers.
- `src/features/google-drive/components/GoogleDrivePanel.tsx` copy should explain that the backup is a visible `daybox.json` file in Drive root.
- Existing appDataFolder backups remain untouched and will not be found by the new visible-root restore flow unless a separate migration/import path is added later.
