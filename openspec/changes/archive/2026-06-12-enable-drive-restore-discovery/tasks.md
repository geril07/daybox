## 1. Restore Discovery Behavior

- [x] 1.1 Confirm `src/features/google-drive/store.ts` restore falls back to finding root `daybox.json` when no local `dayboxFileId` is available.
- [x] 1.2 Persist the discovered root file id and `backupFileSpace` marker after restore discovery succeeds.
- [x] 1.3 Add or update store tests proving restore can discover and restore a root `daybox.json` without a local file id.
- [x] 1.4 Keep the existing not-found behavior when no accessible root `daybox.json` exists.

## 2. Panel Behavior

- [x] 2.1 Update `GoogleDrivePanel` so connected users can open Restore even when this browser has no local `dayboxFileId`.
- [x] 2.2 Keep Restore disabled only while backup or restore is already in progress.
- [x] 2.3 Update panel copy to explain that Restore searches Google Drive root for `daybox.json`.
- [x] 2.4 Update component tests for the connected/no-local-backup state to expect Restore enabled and gated by confirmation.

## 3. Verification

- [x] 3.1 Run `npm run format`.
- [x] 3.2 Run `npm run typecheck`.
- [x] 3.3 Run `npm run lint`.
- [x] 3.4 Run `npm run test`.
