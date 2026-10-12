## Why

Renaming a recurring series leaves already-generated upcoming tasks unchanged, forcing users to rename each one manually. Generation timing should not determine whether a rename applies.

## What Changes

- Rename unfinished tasks scheduled for the effective planner date or later when their series id and title match the series being renamed and its previous title.
- Preserve past, completed, unscheduled, and differently named tasks.
- Keep individual task edits local and all non-title series edits generation-only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recurring-tasks`: Series title changes also update matching upcoming unfinished occurrences.

## Impact

Tasks store, recurrence tests, Settings and app integration tests. No schema changes, dependencies, migration, or override tracking.
