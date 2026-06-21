## Why

The Google Drive backup button currently triggers immediately with no confirmation, while the Restore button has a full AlertDialog confirmation. This inconsistency risks accidental overwrites of the user's Drive backup file. A confirmation step gives the user a moment to confirm before overwriting their cloud backup.

## What Changes

- Add an AlertDialog confirmation before executing the backup action in the Google Drive panel
- The dialog will inform the user which Google Drive file will be overwritten and when the last backup was made
- Unit test coverage for the new confirmation dialog behavior

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `google-drive-backup`: Add explicit user confirmation requirement before backup execution, matching the existing restore confirmation pattern

## Impact

- `src/modules/google-drive/components/GoogleDrivePanel.tsx` — wrap backup button with AlertDialog
- Update `openspec/specs/google-drive-backup/spec.md` with new confirmation scenarios
- `src/modules/google-drive/components/GoogleDrivePanel.test.tsx` — add tests for backup confirmation flow
