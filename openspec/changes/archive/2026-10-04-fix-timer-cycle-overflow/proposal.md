## Why

Manual phase changes and a reduced long-break interval can leave the completed-focus count above the configured interval. The timer's "long next" label then promises a long break while the scheduler can choose a short break instead.

## What Changes

- Schedule a long break after the next focus interval whenever the completed count reaches or exceeds the configured threshold.
- Preserve completed counts and existing manual phase-switch, skip, and reset behavior.
- Keep the original timer-bar text and layout, including "7 of 4" as a completed count against the break target.
- Add regression coverage for bypassed long breaks, interval reductions, and persisted excess counts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pomodoro-timer`: Define overdue long-break scheduling and clarify that cycle text reports the completed count against the break target, including excess counts.

## Impact

Timer store phase selection and store/timer-bar regression tests. No production UI, layout, dependency, schema, storage-key, or migration changes.
