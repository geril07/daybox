## Context

See proposal.md for motivation. All state lives in feature-owned Zustand stores persisted with `persist` + `createValidatedRehydrate`, and file export/import and Google Drive backup share one save-slice pipeline (`src/modules/data-portability/`). Task mutations live in `src/modules/tasks/store.ts`. Focus interval endings are handled in `src/modules/timer/components/TimerBar.tsx`, which already reads the focused task and increments its `pomoCompleted`. The tasks module imports the timer module, so the timer store cannot import tasks.

## Goals / Non-Goals

**Goals:**

- Record the facts that current state loses: reschedules, completion transitions, deletions, and focus interval endings with duration.
- Keep the history module a leaf so any feature can record into it without import cycles.
- Keep the change small enough that the stores' existing behavior and tests stay as they are.

**Non-Goals:**

- Event sourcing: stores stay the source of truth; history is a side record and is never replayed into state.
- Generic diff logging of every field change (titles, sort order, estimates, groups).
- Retention, compaction, IndexedDB, a clear-history control, or any analytics UI.
- Cross-store atomicity between a task write and its history write.

## Decisions

### A leaf `history` module with one append action

`src/modules/history/` owns `schema/v1.ts`, `schema.ts`, `types.ts`, `store.ts`, `save/slice.ts`, and `index.ts`. It imports only `src/shared/`. The store exposes `events` and one action, `recordEvent(input)`, where `input` is an event without `id`, `at`, and `utcOffsetMinutes`; the store fills those (`generateId()`, `new Date().toISOString()`, `-getTimezoneOffset()`) and appends.

Alternative: subscribe to task/timer store changes and derive events from diffs. Rejected: a diff cannot tell Skip from natural completion, cannot see deleted tasks' data after the fact, and fires on import and rehydration.

### Callers record at the point of mutation

- Tasks store: `updateTask` (date change), `toggleTask` (both directions), `deleteTask`, `deleteSeries`, `deleteTasksByGroupId`. Snapshot fields are read from the task before the mutation.
- `TimerBar`: natural completion and Skip next to the existing `pomoCompleted` increment; Restart and phase switch record `abandoned` when the focus interval has elapsed time. `TimerBar` already has the focused task, so it can snapshot `groupId` without the timer store importing tasks.

`skipOccurrence` does not record `task.deleted`: the series `skipDates` already records that decision, and a skip is not a deletion.

### Event shape

A zod discriminated union on `type`, all sharing `{ id, at, utcOffsetMinutes }`:

| type               | payload                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `task.rescheduled` | `taskId`, `from: date \| null`, `to: date \| null`                                                          |
| `task.completed`   | `taskId`, `title`, `groupId`, `date: date \| null`                                                          |
| `task.uncompleted` | `taskId`                                                                                                    |
| `task.deleted`     | `taskId`, `title`, `groupId`, `completed`                                                                   |
| `focus.ended`      | `taskId \| null`, `groupId \| null`, `outcome: completed \| skipped \| abandoned`, `plannedMs`, `focusedMs` |

Snapshots of `title`/`groupId` are kept on completion and deletion so old periods stay readable after the task is gone. `utcOffsetMinutes` lets a later view compute the local day of an event even if the time zone changes; the planner's `dayStartMinutes` can be applied on top at read time.

`focusedMs` for `completed` is `plannedMs`: the stored `elapsed` can overshoot the planned duration after a delayed tick or reload. For Skip and abandon it is the live elapsed time (stored `elapsed` plus the running segment), capped at `plannedMs`.

### Persistence and portability

Persist under `daybox-history` with `createValidatedRehydrate` (invalid blob → empty list, one warning), like other stores. A `history` save slice (version 1) exports `{ version: 1, events }`, validates with the same schema plus a duplicate-id check, defaults to an empty list when missing, and replaces the list on commit. It is registered last in `saveSlices` because nothing depends on it.

Importing a snapshot replaces history, like every other slice. Importing an old file without a `history` slice therefore empties local history; this matches the existing "import replaces current data" contract and the confirmation dialog already warns about replacement.

## Risks / Trade-offs

- [Unbounded growth in localStorage] → At ~100–150 bytes per event and a few dozen events per day, history grows by roughly 0.5–1.5 MB per year against a ~5 MB origin quota. Revisit (IndexedDB or compaction) when the blob nears ~2 MB; all access goes through the module barrel, so the move stays local to `history` and the export pipeline.
- [Whole-list rewrite on each event] → `persist` serializes the full list per write. Events are user-paced (not per tick), so the cost is negligible at the expected size.
- [Separate keys are not atomic] → A task write can succeed while the history write fails (for example on quota). The task state stays authoritative; the event is missing. Accepted for a personal local-first app.
- [Corrupt history blob resets to empty] → Same policy as every other store; one malformed event loses the list. Accepted for consistency; the blob is only written through the typed action.
- [Native date input can fire intermediate changes] → Typing a date digit by digit can produce several `task.rescheduled` events. Accepted; later views can collapse consecutive reschedules of the same task within a short window.
- [Focus attribution] → `focus.ended` is attributed to the task focused when the interval ends, even if focus moved mid-interval. Accepted; it matches how `pomoCompleted` is credited today.
- [Multiple tabs] → Two open tabs each run the timer effect, as with `pomoCompleted` today; history may record a completion twice. Not addressed in this change.

## Migration Plan

No data migration: the new key starts empty on first load. Rollback is removing the module; an orphan `daybox-history` key is harmless. Exports from this version contain a `history` slice that an older deployed build would reject as unknown, which only matters if the app is rolled back after users export.
