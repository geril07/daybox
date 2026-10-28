## Why

DayBox keeps only the current state of tasks. A reschedule overwrites `date`, a reopen clears `completedAt`, a delete removes the task, and a finished focus interval only increments the task's `pomoCompleted` counter without a date or duration. Future history views (completed tasks per week, reschedule and overdue counts, pomodoros per day) cannot be reconstructed from this state, so every day of use without a record is history that is lost for good. This change starts recording that history now, before any analytics UI exists.

## What Changes

- Add an append-only activity history: a list of immutable, timestamped events persisted in its own localStorage key `daybox-history`.
- Record five event types:
  - `task.rescheduled` when a task's date changes (from → to).
  - `task.completed` / `task.uncompleted` when a task is checked or unchecked.
  - `task.deleted` when a task is removed by delete, series deletion, or group deletion.
  - `focus.ended` when a focus interval ends by natural completion, Skip, or abandonment (Restart or phase switch), with planned and focused duration.
- Every event stores its UTC instant and the local UTC offset at record time, so later views can bucket it by local day.
- Include the history in file export/import and Google Drive backup/restore through a new `history` save slice.
- No analytics UI, no clearing control, no retention, and no backfill from existing `pomoCompleted` or `completedAt` values.

## Capabilities

### New Capabilities

- `activity-history`: The append-only record of task and focus events — event types, what triggers each event, event payloads, immutability, and persistence.

### Modified Capabilities

- `data-persistence`: Adds the `daybox-history` key to the persisted keys, rehydration validation, and typed persist configuration, and includes history in export/import.
- `data-portability`: Registers the `history` save slice in the canonical registry order.
- `google-drive-backup`: The backup snapshot includes the `history` slice.

## Impact

- New module `src/modules/history/` (store, schema, types, save slice, barrel). It imports only `src/shared/`.
- `src/modules/tasks/store.ts`: `updateTask`, `toggleTask`, `deleteTask`, `deleteSeries`, `deleteTasksByGroupId` record events.
- `src/modules/timer/components/TimerBar.tsx`: natural completion, Skip, Restart, and phase switch record `focus.ended`.
- `src/modules/data-portability/registry.ts` and pipeline test fixtures gain the `history` slice; the envelope stays at version 1.
- New localStorage key `daybox-history`. Expected growth: about 100–150 bytes per event.
- No new dependencies.
