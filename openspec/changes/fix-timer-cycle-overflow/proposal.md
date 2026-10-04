## Why

Manual phase changes and a reduced long-break interval can leave the completed-focus count above the configured interval. The timer then displays impossible cycle fractions such as "7 of 4", and its "long next" label can contradict the next scheduled break.

## What Changes

- Schedule a long break after the next focus interval whenever the completed count reaches or exceeds the configured threshold.
- Preserve completed counts and existing manual phase-switch, skip, and reset behavior.
- Show excess progress as a completed count instead of an out-of-range fraction, and derive the next-break hint from the scheduling rule.
- Add regression coverage for bypassed long breaks, interval reductions, and persisted excess counts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pomodoro-timer`: Define overdue long-break scheduling and truthful session progress when the count exceeds the configured interval.

## Impact

Timer store phase selection, timer-bar cycle text, and their colocated tests. No dependency, schema, storage-key, or migration changes.
