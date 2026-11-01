## Context

See proposal.md. The history module was shipped in `add-activity-history` with a single localStorage blob behind zustand `persist`. Every event rewrites the full array: measured ~370 B per event, ~2.3 MB per year of typical use, with a 12 ms serialization per write at 10k events in Node and more on a phone. The same quota holds tasks, so history growth can break task saving.

## Goals / Non-Goals

**Goals:**

- One record per event write; no whole-list rewrite.
- Take history out of the localStorage quota.
- Keep the save slice, export format, and Drive backup unchanged.
- Migrate existing history without user action and without duplicates.

**Non-Goals:**

- Moving tasks, groups, timer, or planner to IndexedDB.
- Retention policies, event rollups, or an analytics UI.
- Lazy/paged history reads: the whole list still loads into memory at startup.

## Decisions

### `idb` instead of hand-written request plumbing

`idb` (8.0.4, ~1 kB gzip) wraps the callback API, transactions, and upgrades, and its own tests run against real browsers. Hand-rolling promise wrappers around `IDBRequest`/`IDBTransaction` is the kind of lifecycle code worth not maintaining. Raw IndexedDB stays an option if the dependency ever becomes inconvenient; the storage module is three functions deep.

### Database `daybox`, stores `historyEvents` and `historyMeta`

One database for the app rather than one per feature, so moving another store later needs no second database. `historyEvents` uses `keyPath: 'id'` so a repeated write is an upsert, and an `at` index for future range queries. `historyMeta` is a generic key/value store (`keyPath: 'key'`); today it holds `trackingStarted` with `{ trackingStartedAt, trackingUtcOffsetMinutes }`.

### Memory cache keeps the rest of the app synchronous

`buildSnapshot()` and `prepareSnapshotImport()` are synchronous and used by the settings drawer and the Drive store. Rather than make the portability pipeline async for one slice, the store loads the event list once at startup into the array it already had. Export reads that array. Only storage is async.

The load merges instead of replacing: events recorded before the load finished are deduplicated by `id` and kept after the loaded ones. A data import marks the load as superseded so late-arriving stored events cannot reappear after a replace.

### Recording never blocks on storage; failures warn

`recordEvent` appends to memory and fires the storage write without awaiting it. A failed write (unavailable IndexedDB, closed connection) logs one warning and loses that event; the in-memory list stays correct for the session. This matches the previous behaviour, where a full localStorage also silently dropped the write.

### Migration runs before the first read, and removes the key last

The legacy blob is validated with `HistoryStateSchema`, written to IndexedDB, and only then deleted from localStorage. `put` by `id` makes a re-run idempotent, so an interrupted migration completes on the next load. An invalid legacy blob is deleted with a warning: the previous app would have reset it on its next write anyway.

### Per-record validation instead of reset-everything

A blob was validated as a whole because it was stored as a whole. With one record per event, a single bad record should not discard years of history: invalid records are skipped and the count is logged once.

### Tests use `fake-indexeddb`

`jsdom` provides neither `indexedDB` nor `structuredClone`; the Node `structuredClone` survives Vitest's jsdom environment, so no polyfill is needed. A differential check of 24 IndexedDB behaviours (upserts, key ordering, ranges, unique index aborts, transaction inactivity across macrotasks, abort rollback, clone errors, cursor deletes, atomicity across stores) matched Chromium exactly, while `fake-indexeddb` diverges from browsers mainly on WebIDL surface and exception-order races. Persistence across reloads and two-tab behaviour are verified once in a real browser instead.

## Risks / Trade-offs

- [Older app versions cannot see history after the migration] → Expected: the key is gone and the old code reads only localStorage. Rolling back the deployment loses visibility of history until the newer version returns.
- [A startup race: user exports before the load finishes] → Both export paths await `ensureHistoryLoaded()`; the store itself tolerates early events.
- [A failed storage write loses that event] → Warn once; the alternative (blocking the UI on storage) is worse for a timer interaction.
- [The whole list stays in memory] → ~370 B per event; 20k events is a few megabytes, acceptable. Paging becomes necessary only if history reaches hundreds of thousands of events.
