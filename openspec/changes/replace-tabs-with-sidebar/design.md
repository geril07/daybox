## Context

The app shell currently owns the active planner `view` as local React state and renders a horizontal tab strip in the sticky header. The planner feature supports `today`, `tomorrow`, `week`, `unscheduled`, and an internal `date` browser view; groups are task metadata, with group UI hidden when only one group exists. A `GroupLens` component exists but is intentionally not mounted in the current header.

The requested direction keeps DayBox time-first while adding a second, independent group-filter axis. Persisting the selected sidebar item or selected group lens is explicitly out of scope for this change and should remain follow-up/backlog work.

## Goals / Non-Goals

**Goals:**

- Replace the planner tabs with sidebar navigation.
- Keep `Today` as the initial view and keep view selection unpersisted.
- Add a `Later` view for tasks scheduled after the current configured week.
- Add a sidebar group lens where `null` means `All groups` and a concrete group id filters tasks to that group.
- Apply the selected group lens consistently to all sidebar time views.
- Default quick-add to the selected group when a concrete group lens is active.
- Preserve the existing date-bucket reorder behavior in unfiltered `All groups` views.

**Non-Goals:**

- No `All Tasks` view in this change.
- No persisted sidebar view or group lens selection.
- No group-first nested navigation.
- No task data migration or localStorage schema migration.
- No new external dependency.

## Decisions

1. Use a time-first sidebar with a separate group lens.

   The sidebar should have a `Views` section (`Today`, `Tomorrow`, `This Week`, `Later`, `Unscheduled`) and, when eligible, a `Groups` section (`All groups`, then user groups). This avoids duplicating time views under every group and keeps the state model simple: `selectedView` intersects with `selectedGroupId`.

   Alternative considered: group-first navigation with nested time items. Rejected because it duplicates navigation, makes active state noisy, and demotes the planner's date workflow.

2. Keep sidebar state in the app shell for v1.

   `view` stays local to `App`, and `selectedGroupId` should also live in `App` as local state. The planner store continues to own only planner preferences such as `weekStartDay` and `browseDate`; the group store continues to own groups and sticky add-row group state.

   Alternative considered: persist sidebar selection in the planner store. Rejected for v1 because the existing spec says the view selector is not persisted, and the user explicitly wants persistence as backlog.

3. Treat `Later` as a date-derived planner view.

   `Later` means tasks with a non-null date after the end of the current configured week. It should render as dated sections sorted ascending by date, only for dates that have matching tasks. It should not render blank future days. Quick-add from `Later` should default the task date to the first day after the current configured week, so the newly-created task remains visible in the active view.

   Alternative considered: a flat `Later` list. Rejected because future tasks span many date buckets and per-date sections preserve the existing reorder model.

4. Disable date-bucket drag reorder while a concrete group lens is active.

   Reordering works today by updating sort order within a full date bucket. If the UI shows only one group, hidden tasks from other groups still occupy positions in the same date bucket, so dragging a filtered subset can create surprising interleavings. For v1, `All groups` views keep existing sortable lists, and specific-group views render static task rows.

   Alternative considered: compute a merged full-bucket order from the filtered subset and hidden tasks. Rejected for this change because it adds non-obvious ordering semantics and more implementation/test surface.

5. Use responsive sidebar presentation.

   On wider viewports, render a persistent left sidebar beside the planner content. On narrow viewports, render the same navigation model inside a left-side sheet opened from the header; do not reintroduce a tab strip.

   Alternative considered: keep a permanent skinny rail on mobile. Rejected because the current task list needs horizontal room for title, metadata, and actions.

## Risks / Trade-offs

- Group-filtered views lose drag reorder in v1 -> Make the behavior explicit in specs and keep `All groups` fully sortable.
- Sidebar adds another state axis to the app shell -> Keep it local, nullable, and unpersisted to avoid store/schema churn.
- `Later` could grow long -> Render only dates with matching tasks and keep sorting deterministic by date then task order.
- Active add-row group can conflict with active lens -> Let a concrete group lens win for plain quick-add, while explicit `#group` syntax continues to override.

## Migration Plan

- No persisted data migration is required.
- Replace tab UI and tests with sidebar equivalents.
- Remove the narrow tab-label compression behavior and its tests.
- Rollback is a UI-only revert: restore the tab list and remove the `later` view and app-shell group lens wiring.

## Open Questions

- None for v1. Persisted sidebar selection and an `All Tasks` view remain backlog/follow-up items.
