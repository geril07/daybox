## Context

The Google Drive panel has a "Back up" button that triggers immediately, while "Restore" wraps its action in an AlertDialog confirmation. Adding the same pattern to backup prevents accidental overwrites of the cloud backup file and keeps the UI consistent.

## Goals / Non-Goals

**Goals:**

- Add an AlertDialog confirmation before the backup action fires
- Mirror the existing restore confirmation dialog pattern (same component, same layout)
- Show the user relevant context: which file will be overwritten, when the last backup was

**Non-Goals:**

- Changing the backup logic in the store or drive API
- Adding new configuration or preferences
- Altering the restore confirmation dialog

## Decisions

1. **Use the same AlertDialog pattern as restore** — The restore confirmation already uses `@/shared/ui/alert-dialog` with `AlertDialogTrigger` wrapping the `Button`. The backup confirmation will follow the same structure, with the trigger wrapping the existing "Back up" button.

2. **Show last-backup info in the description** — When `lastBackupAt` is available, the dialog description will include it (e.g., "Last backup: 2 days ago"). This gives the user a quick reference before confirming the overwrite.

3. **No new component** — The state (`backupConfirmOpen`) and dialog will live directly in `GoogleDrivePanel.tsx`, matching the restore pattern. No extraction needed for a single-use dialog.

## Risks / Trade-offs

- None significant — this is a pure UI guard with no state or data flow changes. The backup action is identical once confirmed.
