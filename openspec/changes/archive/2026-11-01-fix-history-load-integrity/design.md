## Context

See proposal.md. The change fixes the storage layer added by `move-history-to-indexeddb`, which is still unmerged, so the persisted record shape can change without a migration.

## Goals / Non-Goals

**Goals:**

- Restore events in the order they were recorded, including after migration.
- Never write a snapshot that silently omits history.
- Keep the failure surface honest: one warning plus a visible refusal on export paths.

**Non-Goals:**

- Cross-tab sync of recorded events.
- Recovering an order that a released version already lost (nothing has shipped).

## Decisions

### A `seq` on the stored record, not sorting by `at`

The order cannot be recovered from the events: a group deletion writes several events with the same `at`, and a late-detected focus completion is recorded with an `at` earlier than events already logged. Sorting by `at` would therefore rewrite the log's meaning.

The record is keyed by `id`, so `getAll()` sorts by a random UUID. `seq` is a stored field with a unique index: `appendStoredEvent` reads the last record through the index and adds one inside the same readwrite transaction (transactions on one store are serialized, so two tabs cannot take the same number), and the bulk writers assign the sequence from array position. Migration writes the legacy array unchanged, which preserves the only true record of the order.

Alternative: an auto-increment store key with `id` as a unique index. Rejected: upserts and the duplicate-id check would need a lookup before every write, and the event id is the natural identity everywhere else.

### Load state is a first-class result

`ensureHistoryLoaded()` resolves to `ready` or `failed`. Export and backup treat `failed` as "history is missing" and refuse, because the alternative — uploading a snapshot with an empty history over the single Drive backup — destroys the remote copy of data that is still on disk. `recordEvent` keeps working in memory so the app stays usable; the events simply cannot be persisted until a reload.

### Meta is validated like events

An unreadable tracking start becomes `null` on load, and `ensureStoredTrackingStart` replaces it with the current time in one readwrite transaction. Doing the read and the write in one transaction also closes a window where an import could commit between them and be overwritten.

### Import is not blocked by a failed load

Export refuses, import does not. A user whose browser cannot read IndexedDB is most likely restoring data on purpose, and blocking the restore would leave them with no way in or out. The import runs, and the history write failure is reported as a warning next to the success — never as a silent success.

### Connection lifecycle

`blocking` closes the connection when another tab opens a higher version; `terminated` drops the cached promise so the next call reopens. Without both, this build's open connection would block any future version upgrade of the shared `daybox` database forever, and a terminated connection would keep failing writes behind one warning.

The database version was also raised to 2 with an upgrade that adds a missing index, so an origin that ran the earlier build of this branch keeps working instead of failing every write behind one warning.

## Risks / Trade-offs

- [Sequence lookups add a cursor read per recorded event] → One index cursor on a small store; events are recorded a few times per minute.
- [Refusing export when storage fails blocks a feature that used to work] → Correct trade-off: an incomplete backup is worse than a refused one, and the error names the cause.
- [A failed load is not retried in the same session] → Deliberate: retrying silently could resurrect half-loaded data. The message asks for a reload.
