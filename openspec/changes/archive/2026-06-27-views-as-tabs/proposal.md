## Why

The sidebar contained both Views (Today/Tomorrow/This Week/Later/Unscheduled) and Groups navigation. Views took up vertical space in the sidebar and required the user to look to the left sidebar to switch views. Moving views into a tab bar above the task list area puts the view switcher closer to the content and frees up sidebar space for groups.

## What Changes

- **New** `src/app/ViewTabs.tsx` — a horizontal tab bar rendered above the task list showing all five views with task counts
- **Modified** `src/app/App.tsx` — render `ViewTabs` inside the main content area; removed `selectedView`/`onSelectView` props from `Sidebar`
- **Modified** `src/app/Sidebar.tsx` — removed the "Views" section entirely; simplified props (no longer needs `selectedView` or `onSelectView`)
- **Modified** `src/app/App.sidebar.test.tsx` — removed all view-related tests; simplified component rendering (no more unused props)
- **Modified** `src/shared/ui/tabs.tsx` — removed `p-[3px]` from `tabsListVariants` base styles

## Capabilities

- app-shell (modified)

## Impact

- **Added:** 1 file (129 lines)
- **Modified:** 4 files (34 lines changed)
- **Deleted:** 0 files
- **No external dependencies added**
