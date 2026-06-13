## Context

The visible Google Drive backup flow stores a single `daybox.json` file in the user's Drive root and persists the file id in local browser state. That file id is local-only, so a second browser or device starts connected with no local `dayboxFileId` even though a backup may already exist in Drive.

The store-level restore flow is intended to handle this by searching Drive root for accessible `daybox.json` when the local file id is missing. The UI must not block that path. For cross-device sync, Restore should mean "try to find and restore the Drive backup", not "restore only if this browser has backed up before".

## Goals / Non-Goals

**Goals:**

- Let connected users attempt Restore before this browser has performed a backup.
- Preserve the existing confirmation dialog before download and local replacement.
- Use Drive root discovery for accessible `daybox.json` when the local `dayboxFileId` is missing.
- Show the existing "No backup found" error when discovery finds nothing.
- Make panel copy clear that Restore searches Google Drive root.

**Non-Goals:**

- No automatic background sync.
- No conflict resolution or merge behavior.
- No Google Picker in this change.
- No broadening from `drive.file` to full Drive access.
- No change to snapshot format or data-portability import behavior.

## Decisions

### Enable Restore whenever connected and not busy

The Restore button should be disabled only while backup or restore is already in progress. A missing local `dayboxFileId` is not a disabled state because it is exactly the cross-device discovery case.

Alternative considered: keep Restore disabled until a local backup id exists. Rejected because it prevents restoring on a new device.

### Keep missing backup as a runtime result

If no accessible root `daybox.json` exists, the user should learn that after confirming Restore and the store attempts discovery. This preserves one clear path: click Restore, confirm replacement risk, then either restore or show "No backup found".

Alternative considered: perform preflight discovery when rendering the panel. Rejected because it adds background Drive calls, extra loading state, and token refresh complexity for little benefit.

### Persist discovered file id after successful discovery

When restore finds a root `daybox.json` without a local id, the store should persist that id with the root backup marker. That makes later backup/restore calls use the known file directly.

Alternative considered: do not persist ids found during restore. Rejected because it would repeat discovery on every restore/backup from that browser.

## Risks / Trade-offs

- User may click Restore on an account with no backup -> The existing not-found inline error explains the outcome without mutating local data.
- `drive.file` may not see a manually created file -> The copy should say DayBox searches for its accessible `daybox.json`; Google Picker can be added later if manual file selection becomes necessary.
- Restore is more prominent before any local backup -> The confirmation dialog still protects against accidental local replacement.

## Migration Plan

- Change UI disabled logic and tests only after the visible-root Drive helper behavior exists.
- No localStorage migration is required for this change.
- Rollback is source-only: Restore would again be disabled until a local file id exists.
