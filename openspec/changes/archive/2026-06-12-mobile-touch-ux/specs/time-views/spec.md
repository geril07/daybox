## ADDED Requirements

### Requirement: View tabs compress on narrow viewports

The view tabs in the planner header (`Today`, `Tomorrow`, `This Week`, `Unscheduled`) SHALL display a shorter label when the viewport is narrower than the `sm` breakpoint (640 px), and SHALL display the full label at or above that breakpoint. The "This Week" tab's short label SHALL be `Week`; the other three tabs (`Today`, `Tomorrow`, `Unscheduled`) SHALL display their full label at all viewport widths.

The selection state, the `value` enum mapping, and the `onValueChange` callback SHALL be unchanged across viewport widths. Only the visible text in the `TabsTrigger` differs.

#### Scenario: Compressed label below the sm breakpoint

- **WHEN** the viewport width is less than 640 px and the user is on the planner header
- **THEN** the `This Week` tab's trigger displays the text `Week`
- **AND** the other three tabs display their full labels (`Today`, `Tomorrow`, `Unscheduled`)

#### Scenario: Full label at or above the sm breakpoint

- **WHEN** the viewport width is 640 px or greater
- **THEN** the `This Week` tab's trigger displays the text `This Week`
- **AND** the other three tabs display their full labels

#### Scenario: Tab selection is preserved across a resize

- **WHEN** the user has `This Week` selected on a viewport narrower than 640 px (where the trigger reads `Week`)
- **AND** the user resizes the viewport to 640 px or greater
- **THEN** the trigger text updates to `This Week`
- **AND** the active view remains `week` (no re-selection needed)

#### Scenario: Tab values are not viewport-dependent

- **WHEN** the planner header is rendered at any viewport width
- **THEN** the `value` attribute of the `This Week` tab's `TabsTrigger` is `'week'`
- **AND** selecting it at any width sets the planner's `view` state to `'week'`
