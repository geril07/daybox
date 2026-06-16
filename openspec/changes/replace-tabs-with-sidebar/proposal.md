## Why

DayBox's planner navigation is outgrowing a horizontal tab strip: adding more time views and a group lens makes the header crowded and forces unrelated filters into one row. A sidebar can keep the current time-first workflow while making room for a separate group filter axis.

## What Changes

- Replace the planner header tabs with a sidebar view selector.
- Keep the current default flow: `Today` opens first, and views are not persisted across reloads.
- Expose the existing time views in the sidebar: `Today`, `Tomorrow`, `This Week`, and `Unscheduled`.
- Add a `Later` view for tasks scheduled after the current week.
- Add a separate sidebar group lens with `All groups` plus user-created groups when group UI is eligible to appear.
- Apply the selected group lens to every sidebar time view.
- Default quick-add task creation to the selected group lens when a specific group is active.
- Defer persisted sidebar selection and an `All Tasks` view to follow-up work.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `time-views`: Replace tab navigation requirements with sidebar navigation, add the `Later` time view, and define group-lens filtering across time views.
- `group-management`: Render the group lens in the sidebar instead of the header and preserve progressive disclosure when there is only one group.
- `task-management`: Quick-add defaults new tasks to the selected sidebar group lens when a specific group is active.

## Impact

- `src/app/App.tsx` shell layout changes from a narrow header/tab layout to a responsive sidebar + content layout.
- `src/app/plannerTabs.ts` / `TabLabel` are replaced or renamed around sidebar view items.
- Planner selectors gain support for the `later` view and optional group filtering.
- Task add-row wiring receives the active sidebar group so quick-add can honor the lens.
- Tests/specs covering tab label compression are removed or replaced with sidebar navigation and group-lens coverage.
