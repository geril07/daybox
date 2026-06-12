## Why

DayBox currently supports dated tasks and Pomodoro focus, but it does not support lightweight recurring habits or checklists that reset each day. Users need a way to complete daily routines without turning every habit into a normal task, creating Pomodoro/focus affordances, or adding overdue noise.

## What Changes

- Add daily routine checklists that appear in the Today view as a dedicated routine section.
- Allow users to manage routine definitions in settings: create, rename, activate/deactivate, delete, and reorder routines.
- Allow each routine to contain ordered reusable steps that can be added, edited, deleted, reordered, and toggled active/inactive.
- Track completion per routine step per date using sparse completion state; missing completion means incomplete.
- Reset visible routine progress naturally each day without generating task copies.
- Exclude routines from task-specific behavior: no task date picker, Pomodoro estimate, focus action, group tag, task reorder, or overdue section.
- Include routines in DayBox export/import and backup snapshots with migration support from the current snapshot version.

## Capabilities

### New Capabilities

- `daily-routines`: Defines routine checklists, routine steps, per-date step completion, Today view behavior, and routine management behavior.

### Modified Capabilities

- `data-portability`: Snapshot envelopes include the routines slice and migrate older exports to include empty routine state.
- `time-views`: Today view includes routine content and does not show the empty state when routines are present.
- `settings`: Settings expose routine and step management controls.

## Impact

- New `src/features/routines/` feature with schema, store, slice, queries, and components.
- Today view renders a routine section alongside existing overdue and task sections.
- Settings drawer gains routine management UI.
- Data portability registry and envelope versioning are updated to include routines.
- Tests are added for routine store actions, selectors, Today rendering, settings management, and snapshot migration/apply behavior.
