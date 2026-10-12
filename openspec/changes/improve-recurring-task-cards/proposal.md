## Why

Recurring task editors use technical labels, unexplained controls, and a weekday layout that wraps accidentally. Clear labels and a responsive card will make the controls easier to understand and use.

## What Changes

- Use “Recurring tasks” and “Add recurring task” instead of user-facing “series” terminology.
- Add a section help tooltip and non-interactive action tooltips.
- Show a group color dot and visible Group and Estimated pomodoros labels.
- Keep seven equal weekday buttons in one row; widen Settings slightly and stack labelled controls on narrow screens.
- Verify long names, themes, weekday ordering, and narrow layouts in the browser; attach screenshots to the PR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recurring-tasks`: Improve Settings naming, help, editor layout, and action discoverability.

## Impact

Settings drawer, recurring-task panel, group picker width and option wrapping, an optional sibling action slot in the shared accordion header, component tests, and browser verification. No persisted state or recurrence behavior changes; shared tooltip behavior stays unchanged elsewhere.
