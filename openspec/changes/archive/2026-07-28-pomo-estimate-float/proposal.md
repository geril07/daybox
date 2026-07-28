## Why

Persisted task state is rejected on rehydrate when any task has a non-integer `pomoEstimate` (Zod `safeint`), wiping the entire `daybox-tasks` store back to defaults. Fractional estimates (e.g. half-pomos) are a reasonable planning value and already reach localStorage via the estimate `NumberInput`; the schema should accept them instead of discarding all tasks.

## What Changes

- Relax `pomoEstimate` validation from integer to any finite number in `[0, 99]` (drop `.int()`).
- Leave `pomoCompleted` as integer — timer increments by whole pomodoros; no change requested.
- Spec/docs: document that estimate may be fractional; display and progress math already work with floats.
- No migration / no version bump — v1 schema widens in place (previously valid ints remain valid).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `task-management`: `pomoEstimate` MAY be a non-integer number in `[0, 99]`; rehydrate/import MUST accept fractional estimates without resetting the tasks slice.

## Impact

- `src/modules/tasks/schema/v1.ts` — primary fix
- `Task` type (inferred) — `pomoEstimate` remains `number` (no type surface change)
- Rehydrate path (`createValidatedRehydrate` + `daybox-tasks`) — stops hard-resetting on fractional estimates
- Import/export pipeline — same `TaskSchema`; fractional estimates pass prepare/commit
- UI (`TaskRow` `PomoArea`, progress bar, `X/Y` label) — already numeric; no required UI change
- Tests — add schema/rehydrate coverage for fractional `pomoEstimate`; existing int fixtures stay valid
- `pomoCompleted` and timer increment logic — unchanged
