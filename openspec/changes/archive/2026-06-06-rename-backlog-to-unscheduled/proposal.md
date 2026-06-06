## Why

The fourth planner view is named "Backlog" but it shows tasks with `date=null` — tasks that haven't been scheduled, not a prioritized queue. The date picker in `TaskRow` already labels this state "Unsched.", creating an inconsistency where the same concept has two different names. "Backlog" implies ordering and queue semantics that don't exist; "Unscheduled" describes exactly what the filter does.

## What Changes

- Rename the "Backlog" tab label to "Unscheduled" in the planner tab bar.
- Rename the section header from "Backlog" to "Unscheduled" in `DayView`.
- Update the Today empty-state copy from "Pull tasks from Backlog or add a new one." to "Pull unscheduled tasks or add a new one."
- Rename the internal `'backlog'` string literal in `type View`, `viewMetaMap`, `viewToRange`, `App.tsx`, and `DayView.tsx` to `'unscheduled'`. (No migration needed — `view` is ephemeral `useState`, not persisted.)
- Expand the date picker preset label from `'Unsched.'` to `'Unscheduled'` for consistency (it fits the button at the current font size).
- Update specs and tests to match.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `time-views`: the "Backlog view" requirement and all references to the "Backlog" label are renamed to "Unscheduled view" / "Unscheduled" throughout.

## Impact

- `src/features/planner/queries.ts` — `type View` literal, `viewMetaMap` key and title, `viewToRange` case, empty-state copy
- `src/app/App.tsx` — tab label value and switch case
- `src/features/planner/components/DayView.tsx` — `SingleDayView` type literal
- `src/features/tasks/components/TaskRow.tsx` — date preset label `'Unsched.'` → `'Unscheduled'`
- `src/features/planner/queries.test.ts` — test string literals
- `openspec/specs/time-views/spec.md` — label references (via delta spec)
