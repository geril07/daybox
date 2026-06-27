## ADDED Requirements

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

The system SHALL display the number of tasks in each view as a badge on the tab, shown only when the count is greater than zero.

#### Scenario: Task count badge shown on tabs

- **WHEN** there are tasks matching a view's date filter
- **THEN** the corresponding tab shows a badge with the task count

### Requirement: Tabs use short labels on mobile

The system SHALL show abbreviated labels on small screens (e.g., "Tmrw" instead of "Tomorrow", "Uns." instead of "Unscheduled").

#### Scenario: Short labels on narrow viewports

- **WHEN** the viewport is narrower than the `sm` breakpoint
- **THEN** tabs display short labels instead of full labels

## MODIFIED Requirements

### Requirement: Sidebar only shows groups

The sidebar SHALL only display the Groups section and SHALL NOT display the Views section.

#### Scenario: Sidebar has no view items

- **WHEN** the sidebar is rendered
- **THEN** the sidebar does not contain view navigation items (Today, Tomorrow, This Week, Later, Unscheduled)
- **AND** the sidebar only contains the Groups section

## REMOVED Requirements

### Requirement: [REMOVED] Sidebar contains view navigation

The system no longer requires the sidebar to render view navigation items.

#### Scenario: [REMOVED] View items no longer in sidebar

- **WHEN** the sidebar is rendered
- **THEN** there are no view items rendered inside the sidebar
