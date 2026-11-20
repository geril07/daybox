## Purpose

Governs the app shell layout — the viewport-bound container that frames the desktop navigation rail, the rounded workspace surface, the header, the scrollable content area, and the timer footer. The shell constrains the app to the viewport height and uses an internal scroll container so only the main content area scrolls, eliminating document-level scroll and the layout shift it causes. The shell also governs mobile navigation through the existing drawer, the view tab bar rendered above the task list, and the sidebar's group-only content.

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

At the `md` breakpoint and above, the shell root SHALL lay out the navigation rail and the workspace side by side in a horizontal row; below `md` the workspace takes the full width and navigation moves to the drawer. Inside the workspace, the header, the scrollable main area and the timer footer SHALL form a vertical flex column: the header and TimerBar are `flex-shrink-0` siblings of a `flex-1 min-h-0` main area. The rail SHALL NOT contain the header, main area or timer.

#### Scenario: Header and TimerBar never scroll

- **WHEN** the user scrolls the main content area
- **THEN** the header stays visible at the top of the workspace
- **AND** the TimerBar stays visible at the bottom of the workspace
- **AND** neither header nor TimerBar moves

#### Scenario: Workspace column allows the scroll area to shrink

- **WHEN** the workspace column contains the header, main area and timer footer
- **THEN** the column has `min-height: 0` (via Tailwind `min-h-0`)
- **AND** the `<main>` element can shrink below its intrinsic content height to enable internal scrolling
- **AND** the navigation rail is a sibling of the workspace column, not one of its flex children

#### Scenario: Rail and workspace fill the viewport height

- **WHEN** the shell renders at desktop widths
- **THEN** the rail spans the full viewport height
- **AND** the workspace column fills the remaining width and height beside it

### Requirement: Desktop rail frames a rounded workspace

At viewports at or above the `md` breakpoint, the shell SHALL render a full-height navigation rail containing the DayBox brand above the Groups sidebar, and SHALL render the main content as a rounded workspace surface inset from the viewport edge. The rail and the workspace SHALL be distinguished by theme-derived color rather than a full-width structural border. The Settings control SHALL sit at the upper-right of the workspace header. The rail SHALL be hidden below the `md` breakpoint.

#### Scenario: Desktop shell structure

- **WHEN** the viewport is at least the `md` breakpoint
- **THEN** the brand and the Groups sidebar render inside the colored rail on the left
- **AND** the workspace renders as a rounded surface inset from the top, right and bottom edges
- **AND** the workspace header shows Settings at its upper right
- **AND** the rail is the only place the brand renders

#### Scenario: Theme-derived surfaces

- **WHEN** any theme preset is active in light or dark mode
- **THEN** the rail and workspace surfaces derive their color from the active theme tokens
- **AND** the two surfaces remain visibly distinct without a hard-coded palette

#### Scenario: Timer footer matches the workspace column

- **WHEN** the timer footer renders at desktop or mobile widths
- **THEN** it is a rounded bottom surface
- **AND** its content edges align with the task column's edges
- **AND** the timer remains fixed at the bottom while only the task list scrolls

### Requirement: Mobile navigation uses the existing drawer

Below the `md` breakpoint the rail SHALL be hidden. The workspace header SHALL show a navigation button and the brand, and activating the navigation button SHALL open the existing drawer containing the same Groups sidebar. The drawer SHALL close after a group is selected, and Settings SHALL stay reachable from the header at all widths.

#### Scenario: Narrow viewport navigation

- **WHEN** the viewport is below the `md` breakpoint
- **THEN** the rail is not rendered
- **AND** the header shows the navigation button and the brand
- **AND** activating the navigation button opens the groups drawer
- **AND** selecting a group closes the drawer and applies the group lens

#### Scenario: Settings remain reachable

- **WHEN** the viewport is narrow or wide
- **THEN** the Settings control is present in the workspace header

### Requirement: View tabs are displayed above the task list

The system SHALL render a horizontal tab bar above the task list area with five tabs: Today, Tomorrow, This Week, Later, and Unscheduled.

#### Scenario: View tabs appear above the task list

- **WHEN** the app loads
- **THEN** a tab bar is visible above the task list area
- **AND** the tab bar contains the labels "Today", "Tomorrow", "This Week", "Later", and "Unscheduled"

### Requirement: Active tab has a sliding rounded indicator

The system SHALL display an animated soft, rounded surface behind the active tab that slides to the newly selected tab on click. The indicator SHALL use a neutral surface derived from the current theme rather than a hard-coded color. The tab bar SHALL keep every tab visible and operable without horizontal clipping at narrow widths, preserving each tab's icon, label, and task-count badge.

#### Scenario: Tab indicator slides on selection

- **WHEN** the user clicks a view tab
- **THEN** the active tab indicator slides to the clicked tab with a spring-like animation
- **AND** the selected tab is the only one with the tinted surface

#### Scenario: All tabs stay available on narrow screens

- **WHEN** the viewport is at the smallest supported mobile width
- **THEN** all five tabs are visible within the content width
- **AND** each tab keeps its icon, its short label, and any count badge it shows
- **AND** no tab is clipped or must be scrolled into view horizontally

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

### Requirement: Tabs use short labels when space is tight

The system SHALL choose tab labels from the tab bar's available content width rather than the viewport width alone. When the tab bar is narrower than `32rem` it SHALL show abbreviated labels (e.g., "Tmrw" instead of "Tomorrow", "Uns." instead of "Unscheduled"); when it is wider it SHALL show the full labels. This normally shows short labels on small screens while allowing full labels in a narrow viewport whose content area is wide enough.

#### Scenario: Short labels in a narrow tab bar

- **WHEN** the tab bar's content width is below `32rem`
- **THEN** tabs display short labels instead of full labels

#### Scenario: Full labels in a wide tab bar

- **WHEN** the tab bar's content width is at least `32rem`
- **THEN** tabs display the full labels
- **AND** all five tabs still fit without horizontal clipping

### Requirement: Sidebar only shows groups

The sidebar SHALL only display the Groups section and SHALL NOT display the Views section.

#### Scenario: Sidebar has no view items

- **WHEN** the sidebar is rendered
- **THEN** the sidebar does not contain view navigation items (Today, Tomorrow, This Week, Later, Unscheduled)
- **AND** the sidebar only contains the Groups section
