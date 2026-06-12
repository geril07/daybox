## Why

DayBox's save snapshot currently uses one app-level snapshot version for every saved entity. That works for the existing flat `v2` and `v3` files, but it couples unrelated schema changes together. If a future task shape changes, the whole app snapshot version must move and old entity schemas can accidentally start importing current feature schemas, making historical files fail before migrations can run.

The save system needs a durable migration model where the file/container format and each feature's data format can evolve independently.

The snapshot also names timer settings as `timer`, which is easy to confuse with the locally persisted timer runtime state. Local persistence intentionally stores runtime state so a running timer can survive reload, but save snapshots should only contain portable/restorable data. The save contract should make that distinction explicit.

## What Changes

- Replace the current flat save snapshot with a nested save envelope that has `envelopeVersion`, `exportedAt`, and a `slices` object.
- Give each participating feature slice its own `version`, schema, migrations, export function, import preparation function, and apply function.
- Rename the timer save slice to `timerSettings` so saved data clearly contains settings only, not runtime state.
- Keep one canonical save snapshot contract shared by file Export, file Import, Google Drive Backup, and Google Drive Restore.
- Move feature/entity migration ownership into the owning feature.
- Keep cross-slice validation and normalization in `data-portability`.
- Preserve support for importing existing flat `version: 2` and `version: 3` files through legacy adapters.
- Leave routines out of this change. Routines remain backlog and can later be added as a new slice.

## Capabilities

### Modified Capabilities

- `data-portability`: define the save envelope, slice registry, slice orchestration, legacy adapters, all-or-nothing prepare/apply, and cross-slice validation.
- `data-persistence`: clarify that local timer persistence includes runtime state, while save snapshots include only timer settings.
- `google-drive-backup`: clarify that Google Drive backup/restore uses the same canonical save snapshot as file export/import.

## Impact

- **Code**
  - `src/features/data-portability/`: owns envelope parsing, legacy flat snapshot adapters, registry orchestration, cross-slice normalization, and all-or-nothing commit.
  - `src/features/tasks/`: exports a save slice with task slice schemas and migrations.
  - `src/features/groups/`: exports a save slice with group slice schemas and migrations.
  - `src/features/timer/`: exports a `timerSettings` save slice with timer-settings schemas and migrations.
  - `src/features/planner/`: exports a save slice with planner slice schemas and migrations.
  - Tests updated for legacy `v2`/`v3` adapters, nested current exports, slice migration behavior, and transport consistency.
- **Data**
  - Existing flat `v2` and `v3` export files remain importable.
  - New exports use `envelopeVersion: 1` and nested `slices`.
  - LocalStorage keys and local persistence schemas do not change.
- **UI**
  - No visible UI changes required.
- **Google Drive**
  - Backup and restore continue using the same data-portability APIs as file export/import.

## Out of Scope

- Adding routines to the snapshot.
- Changing localStorage persistence keys.
- Removing local timer runtime persistence.
- Creating separate Google Drive snapshot contents or a Google-specific save profile.
- Partial/best-effort imports.
- Changing the import confirmation UX.
