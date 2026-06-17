## 1. Planner View Model

- [x] 1.1 Extend the planner `View` type and view metadata to include `later`.
- [x] 1.2 Add date-range helpers or query logic for the end of the configured week and first day after the configured week.
- [x] 1.3 Add planner selectors for filtering by optional `selectedGroupId`, where `null` means all groups.
- [x] 1.4 Add a `Later` section selector that groups matching tasks by future date, sorted by date ascending.
- [x] 1.5 Update `defaultDateForView` so `later` defaults quick-add to the first day after the current configured week.

## 2. Sidebar Shell

- [x] 2.1 Replace the tab metadata/components with sidebar view item metadata for `Today`, `Tomorrow`, `This Week`, `Later`, and `Unscheduled`.
- [x] 2.2 Add app-shell state for `selectedGroupId`, defaulting to `null` and remaining unpersisted.
- [x] 2.3 Build the sidebar navigation UI with a `Views` section and a progressively-disclosed `Groups` section.
- [x] 2.4 Update the desktop app shell layout to render a persistent left sidebar and planner content area.
- [x] 2.5 Update the narrow viewport layout to open the same navigation in a left-side sheet instead of rendering tabs.
- [x] 2.6 Keep the header free of a group lens and remove the planner tab strip.

## 3. View Behavior

- [x] 3.1 Pass the active group lens into Today, Tomorrow, This Week, Later, and Unscheduled rendering paths.
- [x] 3.2 Filter overdue, dated, week, later, and unscheduled task lists by the active group lens.
- [x] 3.3 Add the `Later` view component using sparse per-date sections.
- [x] 3.4 Preserve sortable date-bucket task lists when `selectedGroupId` is `null`.
- [x] 3.5 Render group-filtered date buckets as static task lists when `selectedGroupId` is a concrete group id.
- [x] 3.6 Wire quick-add so a concrete active group lens becomes the default group unless `#group` syntax is used.

## 4. Tests

- [x] 4.1 Replace tab-label tests with sidebar view item and responsive navigation tests.
- [x] 4.2 Add planner query tests for `later`, first-day-of-week boundaries, group filtering, and Later quick-add default date.
- [x] 4.3 Add view/component tests for group-filtered empty states and filtered overdue sections.
- [x] 4.4 Add tests that the group sidebar section is hidden with one group and shown with two or more groups.
- [x] 4.5 Add add-task tests for concrete sidebar group lens defaulting and `#group` override behavior.
- [x] 4.6 Add tests that specific group-lens views do not invoke date-bucket drag reorder wiring.

## 5. Verification

- [x] 5.1 Run `npm run format`.
- [x] 5.2 Run `npm run typecheck`.
- [x] 5.3 Run `npm run lint`.
- [x] 5.4 Run `npm run test`.
