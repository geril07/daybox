## 1. Add backup confirmation dialog

- [x] 1.1 Add `backupConfirmOpen` state and wrap the "Back up" button in an AlertDialog, matching the restore confirmation pattern
- [x] 1.2 Show the last-backup timestamp in the dialog description when available (e.g. "This will overwrite your last backup from 2 days ago.")
- [x] 1.3 Wire the backup action to fire only on dialog confirmation, not on initial button click

## 2. Update tests

- [x] 2.1 Update "calls backup on Back up click" test so backup is NOT called after initial click, only after confirming the dialog
- [x] 2.2 Add test for cancel flow: clicking "Cancel" does not call backup
- [x] 2.3 Add test for confirm flow: clicking "Continue" in the dialog calls backup
- [x] 2.4 Verify existing tests still pass (`npx vitest run src/modules/google-drive/components/GoogleDrivePanel.test.tsx`)

## 3. Sync specs and finalize

- [x] 3.1 Run `npm run format && npm run typecheck && npm run lint && npm run test`
- [x] 3.2 Run `/opsx-sync` to apply delta spec changes to main specs
