## Why

Activity events live in a single `daybox-history` localStorage blob, which has two problems. Every recorded event rewrites the whole list, so a year of history means serializing and storing a few megabytes on each click. And history shares the ~5 MB localStorage quota with tasks, groups, timer, and planner, so a full history can break saving a task.

IndexedDB removes both: one record per event, and a quota three orders of magnitude larger. The `history` save slice keeps its exact shape, so existing exports and Google Drive backups stay compatible.

## What Changes

- Events move from the `daybox-history` localStorage blob to the IndexedDB database `daybox`: object store `historyEvents` (one record per event, keyed by `id`, index on `at`) and `historyMeta` (the tracking start).
- History stops using zustand's `persist`. It loads once at startup into the same in-memory store shape, so snapshot export stays synchronous and the save-slice format does not change.
- A legacy `daybox-history` blob is migrated into IndexedDB on first load and the key is removed after a successful write.
- Stored records are validated individually: an invalid record is dropped with one warning instead of discarding the whole history.
- Export and Google Drive backup await the history load, so a fast export cannot miss stored events.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `activity-history`: persistence moves to IndexedDB, adds migration, per-record validation, and a load-before-export rule.
- `data-persistence`: `daybox-history` leaves the localStorage key set; history no longer uses validated rehydration.
- `data-portability`: the history save slice is exported from the loaded in-memory cache and commits memory first, storage second.

## Impact

- `src/modules/history/`: new `storage/` layer (database, repository, legacy migration), the store drops `persist`, and the save slice exports from memory.
- `src/app/shell/SettingsDrawer.tsx` and `src/modules/google-drive/store.ts` await the history load before building a snapshot.
- New dependencies: `idb` (runtime) and `fake-indexeddb` (tests, since jsdom has no IndexedDB).
