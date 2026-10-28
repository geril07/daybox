## Context

See proposal.md. The `history` module (`src/modules/history/`) is a leaf: callers pass complete event payloads to `recordEvent`, and the store fills `id`, `at`, and `utcOffsetMinutes` from the current time. The feature is unreleased, so the persisted shape and the v1 save slice can change without a migration.

## Goals / Non-Goals

**Goals:**

- Stamp natural focus completions with the countdown's zero-crossing.
- Persist a tracking start from the first launch.
- Snapshot group names next to group ids.

**Non-Goals:**

- Interval identity, deduplication receipts, write-health reporting, or a clear-history control from the earlier design.
- Snapshotting group color.

## Decisions

### `recordEvent` takes an optional occurrence time

`recordEvent(input, occurredAt = new Date())`. `at` and `utcOffsetMinutes` both come from `occurredAt`, so a DST change between the zero-crossing and detection still gives the correct offset. Only `TimerBar` passes it, for natural completion: `occurredAt = now − max(0, liveElapsed − plannedMs)`. Rehydration already adds wall-clock time to `elapsed`, so the overshoot covers sleep and closed tabs. Skip and abandon are user actions and use the current time.

Alternative: store a separate `occurredAt` next to `at`. Rejected: one time field with clear semantics is enough, and nothing needs the detection time.

### Tracking start is store state, persisted on first launch

The store adds `trackingStartedAt` and `trackingUtcOffsetMinutes`, initialized from the module-load time. `persist` writes only on `setState`, so the store module calls `setState({})` once when `daybox-history` is absent; otherwise a launch without events would let a later launch move the start forward. The invalid-blob reset uses the same load-time init, so tracking restarts at that load, which matches the lost history.

The save slice exports both fields. Its missing-slice default is a getter, so a snapshot without history gets a tracking start at import time rather than at module load.

### Group name lookup at the call site

The tasks store and `TimerBar` look up the name in `useGroupStore` (via the groups barrel) when they build the payload; a missing group gives `null`. Group deletion with tasks runs `deleteTasksByGroupId` before `deleteGroup`, so deleted tasks still find their group name. `TimerBar` importing the groups barrel adds a `timer → groups → tasks → timer` module cycle; the binding is read only inside handlers, after all modules have loaded, as with the existing `groups ↔ tasks` cycle.

## Risks / Trade-offs

- [Clock or elapsed errors move the inferred completion time] → The inference uses the same `elapsed` the timer displays; it cannot be worse than the countdown itself.
- [Tracking start written at module load in tests] → Tests reset store state explicitly; the write uses the existing persist storage.
