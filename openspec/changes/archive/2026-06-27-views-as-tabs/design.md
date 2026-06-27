## Context

Views (Today, Tomorrow, This Week, Later, Unscheduled) were rendered as a list in the sidebar. As the sidebar grew with group management features, the view list competed for space. Moving views to a tab bar above the task list puts navigation closer to content and reduces sidebar visual weight.

## Goals

- Move view switching from sidebar to a tab bar above the task list
- Remove view-related props from the Sidebar component
- Preserve all existing view navigation behavior
- Show task counts per view in the tab bar
- Animate the active tab indicator

## Non-Goals

- No new views added
- No view behavior changes
- No changes to group navigation in the sidebar
- No changes to mobile sidebar sheet

## Decisions

1. **Tab bar above task list, below header** — Placed inside the main content container so it scrolls with content. Users see it immediately when looking at tasks.
2. **Sliding indicator (animated)** — Uses `ResizeObserver` and inline styles to animate the active tab indicator. Provides visual feedback without a library dependency.
3. **Short labels on mobile** — Uses `shortLabel` (e.g. "Tmrw", "Uns.") hidden below `sm:` breakpoint to prevent overflow on narrow screens.
4. **Task counts per tab** — Computed via `useMemo` derived from `tasks` and `weekStartDay`. Only shown when count > 0.
5. **Animated indicator via `left`/`width`** — Uses `cubic-bezier(0.16,1,0.3,1)` for a spring-like feel. Indicator is an absolutely positioned div behind the tabs.
6. **Removed `p-[3px]` from shared Tabs** — This was a leftover style from the shadcn migration that caused inconsistent padding in `TabsList` when used alongside the new custom tab bar.

## Risks / Trade-offs

- The tab bar recomputes task counts on every task change. With typical task counts (< 200) this is negligible, but a large task list could cause a minor perf hit. Mitigation: `useMemo` with stable deps.
- The animated indicator uses `getBoundingClientRect` on every active tab change. This runs inside `useEffect` (not on every render) and is paired with a `ResizeObserver` to handle container resizes.

## Migration Plan

1. Create `ViewTabs.tsx` with view tab data, active indicator, and task counts
2. Remove Views section from `Sidebar.tsx` and remove `selectedView`/`onSelectView` props
3. Update `App.tsx` to render `ViewTabs` and stop passing view props to `Sidebar`
4. Update `App.sidebar.test.tsx` to match new Sidebar API
5. Tweak `tabs.tsx` spacing
6. Run typecheck, lint, tests

## Open Questions

None.
