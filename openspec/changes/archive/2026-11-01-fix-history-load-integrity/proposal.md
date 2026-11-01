## Why

Reviewing the IndexedDB move found two ways the new storage can lose or misrepresent existing history.

The object store is keyed by the random event `id`, and `getAll()` returns records in key order. Loading therefore restored events in an arbitrary order, so from the first reload every export and Drive backup carried a shuffled list — and the migration discarded the only record of the real order, the legacy array.

A failed load (unavailable storage, closed connection, corrupt profile) resolved as if the history were simply empty. The next Drive backup would then overwrite the single remote copy with a snapshot that has no history, while the events were still on disk.

## What Changes

- Stored records carry a `seq` that fixes the order they were recorded in. Load returns events in that order, and migration keeps the legacy array order as the sequence. Recording an event takes the next sequence number.
- The history load reports whether it succeeded. Snapshot export and Google Drive backup refuse to run when the load failed and report the failure instead of saving an incomplete snapshot.
- The stored tracking start is validated; an unreadable one is replaced with a fresh value and one warning.
- The database connection is released on `versionchange` from another tab and recreated after a `terminated` event, so a later version upgrade cannot deadlock on this build's open connection.
- Test coverage for the record order, a write failure after a successful load, an interrupted migration, and the raw meta record shape.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `activity-history`: record order, migration order, and the failure behaviour of export paths.

## Impact

- `src/modules/history/storage/` (record type, sequence assignment, meta validation, connection lifecycle) and `store.ts` (load state).
- `src/app/shell/SettingsDrawer.tsx` and `src/modules/google-drive/store.ts` refuse export and backup on a failed load.
