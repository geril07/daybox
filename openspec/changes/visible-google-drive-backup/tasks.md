## 1. Drive API Transport

- [ ] 1.1 Change Google Identity Services scope from `drive.appdata` to `drive.file` in `src/shared/google-drive/client.ts`.
- [ ] 1.2 Rename or replace appDataFolder-specific Drive helpers in `src/shared/google-drive/drive-api.ts` with visible root file helpers.
- [ ] 1.3 Update visible backup creation to upload `daybox.json` into My Drive root and return the created file id.
- [ ] 1.4 Update existing-file writes to keep patching by file id with the current snapshot JSON.
- [ ] 1.5 Update backup discovery to search for accessible, non-trashed root `daybox.json` files in the visible Drive space instead of `spaces=appDataFolder`.
- [ ] 1.6 Update Drive API unit tests to assert `drive.file` behavior indirectly through root metadata/search expectations and remove appDataFolder assertions.

## 2. Google Drive Store Behavior

- [ ] 2.1 Update `src/features/google-drive/store.ts` to call the visible root Drive helpers while preserving the existing `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport` flow.
- [ ] 2.2 Ensure backup uses `dayboxFileId` when accessible, falls back to finding root `daybox.json` when missing, and creates a root file only when no accessible root file exists.
- [ ] 2.3 Ensure restore downloads by `dayboxFileId` when accessible, falls back to finding root `daybox.json` when missing, and returns the existing not-found error when no visible root backup is accessible.
- [ ] 2.4 Handle persisted state from the old appDataFolder model so incompatible hidden `dayboxFileId` values do not make the new root restore appear available incorrectly.
- [ ] 2.5 Update Google Drive store tests to cover first visible backup, repeated backup, fallback discovery, missing restore, and old persisted id handling.

## 3. User Interface

- [ ] 3.1 Update `GoogleDrivePanel` copy to explain that backup creates a visible `daybox.json` file in Google Drive root.
- [ ] 3.2 Keep the connected/disconnected/manual restore UI behavior unchanged except for the visible-file copy and restore availability rules.
- [ ] 3.3 Update component tests for the new copy and any changed restore button availability behavior.

## 4. Specs And Verification

- [ ] 4.1 Run `npm run format`.
- [ ] 4.2 Run `npm run typecheck`.
- [ ] 4.3 Run `npm run lint`.
- [ ] 4.4 Run `npm run test`.
- [ ] 4.5 Manually inspect the final diff to ensure no appDataFolder behavior remains in the visible Drive backup path.
