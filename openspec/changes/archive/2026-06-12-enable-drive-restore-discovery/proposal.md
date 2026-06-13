## Why

The visible Google Drive backup model is meant to support syncing across devices, but a new browser/device does not have the locally persisted `dayboxFileId` yet. Restore must be available after connecting so the app can discover `daybox.json` in Google Drive root and restore from another device's backup.

## What Changes

- Enable the Restore action for connected users even when this browser has no local `dayboxFileId`.
- Keep the confirmation dialog before any download or local mutation.
- On restore, continue using the existing store behavior: download by stored root file id when available, otherwise search Google Drive root for accessible `daybox.json`.
- If no accessible root backup exists, show the existing "No backup found" error.
- Update panel copy to clarify that Restore searches Google Drive root for `daybox.json`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `google-drive-backup`: Change Restore availability and panel behavior so cross-device restore works before the current browser has performed a backup.

## Impact

- `openspec/specs/google-drive-backup/spec.md` requirements change.
- `src/features/google-drive/components/GoogleDrivePanel.tsx` restore disabled logic and copy change.
- `src/features/google-drive/components/GoogleDrivePanel.test.tsx` expectations change for the connected/no-local-backup state.
- `src/features/google-drive/store.ts` should not need major logic changes if it already falls back to Drive root discovery; tests may need to prove that UI can reach that path.
