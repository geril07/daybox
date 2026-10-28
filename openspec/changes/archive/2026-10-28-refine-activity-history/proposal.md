## Why

A review of the earlier, unmerged `add-stats-analytics` design found three data gaps in the new activity history. A focus completion that is detected late (sleep, reload) is stamped with the detection time, which can move it to another day. Without a tracking start, a later view cannot tell "nothing happened that day" from "history did not exist yet". Events keep only `groupId`, so a deleted group becomes an unreadable id. History is still empty for every user, so the schema can change now without a migration.

## What Changes

- A naturally completed focus interval is stamped with the moment its countdown reached zero, not the moment the app detected it.
- The history state records when tracking started (`trackingStartedAt` with its UTC offset). The value is saved on first launch, even before any event.
- `task.completed`, `task.deleted`, and `focus.ended` also snapshot `groupName` (or `null` when the group cannot be found).
- The `history` save slice carries the tracking start. A snapshot without a `history` slice imports as empty history whose tracking starts at import time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `activity-history`: Event time semantics for natural focus completion, group name snapshots, and a persisted tracking start.
- `data-portability`: The `history` save slice includes the tracking start and defines it for a missing slice.

## Impact

- `src/modules/history/` schema, store, and save slice (slice stays version 1; it is unreleased).
- `src/modules/tasks/store.ts` and `src/modules/timer/components/TimerBar.tsx` read the group name from the groups store when they record events.
- `TimerBar` now imports the groups barrel; it is used only at call time.
