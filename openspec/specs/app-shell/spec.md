## Purpose

Governs the app shell layout — the viewport-bound container that frames the header, sidebar, scrollable content area, and timer bar. The shell constrains the app to the viewport height and uses an internal scroll container so only the main content area scrolls, eliminating document-level scroll and the layout shift it causes. The shell also governs the view tab bar rendered above the task list and the sidebar's group-only content.

## Requirements

### Requirement: Internal scroll container

The app shell SHALL constrain itself to the viewport height and SHALL NOT rely on document-level scrolling. Only the main content area (`<main>`) SHALL be scrollable, using `overflow-y: auto`.

#### Scenario: App shell is viewport-bound

- **WHEN** the app renders
- **THEN** the root `.app-shell` element has `height: 100dvh` (via Tailwind `h-dvh`)
- **AND** the root `.app-shell` element has `overflow: hidden`
- **AND** the document `<body>` does not produce a scrollbar

#### Scenario: Only main content scrolls

- **WHEN** content exceeds the available space between the header and TimerBar
- **THEN** only the `<main>` element produces a scrollbar
- **AND** the header remains fixed at the top
- **AND** the TimerBar remains fixed at the bottom
- **AND** no `position: sticky` is used on header or TimerBar

#### Scenario: Scrollbar gutter is stable

- **WHEN** content is short enough that no scroll is needed
- **THEN** the `<main>` element reserves space for the scrollbar via `scrollbar-gutter: stable`
- **AND** the layout does not shift horizontally when switching between views of different content lengths

### Requirement: Flex layout for fixed header and footer

The shell SHALL use a vertical flex layout where the header and TimerBar are flex children (`flex-shrink-0`) and the middle row (`flex-1 min-h-0`) contains the scrollable content area.

#### Scenario: Header and TimerBar never scroll

- **WHEN** the user scrolls the main content area
- **THEN** the header stays visible at the top of the viewport
- **AND** the TimerBar stays visible at the bottom of the viewport
- **AND** neither header nor TimerBar moves

#### Scenario: Content row allows child to shrink

- **WHEN** the content row contains the sidebar and scrollable main area
- **THEN** the row container has `min-height: 0` (via Tailwind `min-h-0`)
- **AND** the `<main>` element can shrink below its intrinsic content height to enable internal scrolling

### Requirement: View tabs are displayed above the task list

The system SHALL render a horizontal tab bar above the task list area with five tabs: Today, Tomorrow, This Week, Later, and Unscheduled.

#### Scenario: View tabs appear above the task list

- **WHEN** the app loads
- **THEN** a tab bar is visible above the task list area
- **AND** the tab bar contains the labels "Today", "Tomorrow", "This Week", "Later", and "Unscheduled"

### Requirement: Active tab has a sliding indicator

The system SHALL display an animated indicator beneath the active tab that slides to the newly selected tab on click.

#### Scenario: Tab indicator slides on selection

- **WHEN** the user clicks a view tab
- **THEN** the active tab indicator slides to the clicked tab with a spring-like animation

### Requirement: Tabs show task count badges

The system SHALL display the number of tasks in each view as a badge on the tab, shown only when the count is greater than zero. The counts SHALL use the same effective planner date, week range, and overdue/later boundaries as the corresponding planner views, including the configured `dayStartMinutes` preference.

#### Scenario: Task count badge shown on tabs

- **WHEN** there are tasks matching a view's date filter
- **THEN** the corresponding tab shows a badge with the task count

#### Scenario: Today and Tomorrow counts follow the day boundary

- **WHEN** the local time is `02:00` on `2026-06-10`
- **AND** the configured day-start time is `02:30`
- **AND** tasks dated `2026-06-09` and `2026-06-10` exist
- **THEN** the Today badge counts the `2026-06-09` tasks
- **AND** the Tomorrow badge counts the `2026-06-10` tasks

#### Scenario: Counts reflect the configured boundary after recalculation

- **WHEN** the app reloads or otherwise recalculates after the local time reaches the configured day-start minute
- **THEN** Today, Tomorrow, This Week, and Later tab counts use the newly effective planner date
- **AND** the counts remain consistent with the views opened from those tabs
- **AND** the app is not required to update these counts solely because wall-clock time passed while the page remained open

### Requirement: Tabs use short labels on mobile

The system SHALL show abbreviated labels on small screens (e.g., "Tmrw" instead of "Tomorrow", "Uns." instead of "Unscheduled").

#### Scenario: Short labels on narrow viewports

- **WHEN** the viewport is narrower than the `sm` breakpoint
- **THEN** tabs display short labels instead of full labels

### Requirement: Sidebar only shows groups

The sidebar SHALL only display the Groups section and SHALL NOT display the Views section.

#### Scenario: Sidebar has no view items

- **WHEN** the sidebar is rendered
- **THEN** the sidebar does not contain view navigation items (Today, Tomorrow, This Week, Later, Unscheduled)
- **AND** the sidebar only contains the Groups section
