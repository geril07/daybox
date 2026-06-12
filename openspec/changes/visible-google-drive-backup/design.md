## Context

DayBox currently offers manual Google Drive backup and restore by storing `daybox.json` in Drive's hidden `appDataFolder` space. The implementation uses Google Identity Services with the `drive.appdata` scope, uploads new files with `parents: ['appDataFolder']`, and finds backups with `spaces=appDataFolder`.

The desired behavior is simpler and more transparent: backing up should create or update a normal user-visible file named `daybox.json` in the user's My Drive root. The existing data-portability snapshot contract remains correct; only the Drive transport changes.

Google Drive treats visible files and app data files as separate spaces. Files cannot move between the `appDataFolder` space and the visible `drive` space, so this change creates a new visible backup path rather than migrating the hidden file in place.

## Goals / Non-Goals

**Goals:**

- Store DayBox backups as a visible `daybox.json` file in the user's Drive root.
- Use the least broad Drive scope that supports app-created visible files, expected to be `drive.file`.
- Preserve the manual connect, backup, restore, and disconnect flow.
- Preserve the canonical data-portability snapshot format and prepare/commit restore pipeline.
- Continue updating a known file by persisted file id when available.
- Fall back to finding `daybox.json` in the Drive root when no persisted file id exists.

**Non-Goals:**

- No folder picker or custom folder selection.
- No automatic sync, background sync, conflict resolution, or multi-device merge behavior.
- No automatic migration from the old hidden `appDataFolder` backup to the visible root backup.
- No broad full-Drive access scope unless `drive.file` proves insufficient during implementation.
- No changes to file-based export/import semantics.

## Decisions

### Use `drive.file` for visible app-created backups

The OAuth scope should change from `https://www.googleapis.com/auth/drive.appdata` to `https://www.googleapis.com/auth/drive.file`. Google documents `drive.file` as a non-sensitive scope for creating or modifying files opened with or created by the app, and it is a better fit than full Drive access for a single app-owned backup file.

Alternative considered: use full Drive scope. Rejected because it is broader than needed and may create a heavier consent/review burden.

Alternative considered: keep `drive.appdata`. Rejected because it necessarily stores the backup in the hidden app data space, which is the problem this change addresses.

### Create the backup in Drive root

New visible uploads should create `daybox.json` in the user's My Drive root. The upload metadata can either omit `parents` or explicitly use `parents: ['root']`; implementation should prefer the clearer option if Drive API behavior is straightforward in tests.

Alternative considered: ask the user to choose a folder. Rejected for this change because root storage satisfies the user goal with much less UI and OAuth complexity.

### Preserve file-id based updates

The store should continue persisting `dayboxFileId` and use it for subsequent uploads. This avoids duplicate visible `daybox.json` files during normal use and preserves the current mental model: Back up updates the same backup.

If the file id is missing, backup should search for a non-trashed `daybox.json` in root and update it if found. If none is found, backup should create a new root file.

Alternative considered: always create a timestamped backup file. Rejected because the current feature is a single latest backup, not backup history.

### Restore from the visible root file only

Restore should download by stored `dayboxFileId` when present. If missing, it should search for non-trashed `daybox.json` in root. It should not silently search the old appDataFolder as a fallback because that would retain hidden behavior and may require keeping the old scope.

Alternative considered: support both hidden and visible locations during migration. Rejected for the first version because it complicates OAuth scopes and UI messaging. Users who need old hidden backups can remain on the old build or use a separate explicit migration/import flow later.

### Keep Drive transport separate from data-portability

The Google Drive feature should continue to call `buildSnapshot`, `prepareSnapshotImport`, and `commitSnapshotImport`. The Drive change should not introduce a new snapshot format or duplicate import/export logic.

## Risks / Trade-offs

- User can delete, rename, or edit `daybox.json` in Drive root -> Restore will show the existing missing or invalid snapshot errors; the panel copy should make the visible-file behavior clear.
- Duplicate `daybox.json` files can exist if the user manually copies files or if Drive search returns multiple matches -> The implementation should use a deterministic first match from Drive search and then persist its id after a successful update.
- Existing hidden backups become undiscoverable by the new restore flow -> The proposal intentionally avoids automatic migration; release notes or UI copy can mention that the next backup creates the visible file.
- Previously granted `drive.appdata` tokens do not grant `drive.file` access -> The next connect/backup flow should request the new scope through Google Identity Services and handle denial using the existing denied path.
- `drive.file` only grants access to app-created or user-selected files -> This is acceptable because DayBox creates the root backup file itself. If restore without a stored id cannot list older root files created by another OAuth client, that is outside this change.

## Migration Plan

- Ship the scope and Drive helper changes together.
- Existing persisted `dayboxFileId` values may point to hidden appDataFolder files and should not be reused blindly after the scope/location change.
- Implementation should either clear incompatible persisted file ids through a small persisted-state version bump or validate that the stored id is accessible before treating it as restorable.
- First successful backup after the change creates or updates a visible root `daybox.json` and stores its id.
- Rollback is source-only: returning to `drive.appdata` resumes the hidden backup model, though visible root files created by this change remain in the user's Drive.

## Open Questions

- Should implementation explicitly set `parents: ['root']`, or omit parents and rely on Drive's default root placement? The desired product behavior is root either way.
- Should the UI include one-time copy that old hidden backups are not migrated, or is the visible-file explanation enough?
