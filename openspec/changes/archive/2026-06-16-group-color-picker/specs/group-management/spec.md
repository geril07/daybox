## ADDED Requirements

### Requirement: User can change a group's color

The system SHALL allow users to change the color of any group (including General) via a color picker in the group settings panel.

#### Scenario: Change group color via swatch

- **WHEN** user clicks the color dot in a group's row
- **THEN** a popover opens with a grid of 16 palette swatches and a native color input
- **AND** the group's current color dot highlights the matching swatch with a ring (if it is a palette color)
- **AND** clicking a swatch updates the group's color and closes the popover

#### Scenario: Change group color via native color input

- **WHEN** user clicks the native `<input type="color">` in the color popover
- **AND** selects a custom color from the browser's dialog
- **THEN** the group's color is updated to the chosen hex value
- **AND** the popover closes (on the change event)
- **AND** the color dot reflects the new custom color

#### Scenario: Color change persists across sessions

- **WHEN** user changes a group's color
- **THEN** the new color is persisted in localStorage under the `daybox-groups` key
- **AND** after a page reload, the group retains the chosen color

### Requirement: User-created groups never collide with General's color

The system SHALL exclude General's palette color (index 0) from the auto-assignment pool when creating new groups.

#### Scenario: Eighth user-created group does not get red

- **WHEN** the default "General" group exists (color index 0)
- **AND** 7 user-created groups exist (occupying palette indices 1–7)
- **AND** the user creates an 8th group
- **THEN** the new group's color is index 8 of the palette (not index 0)

#### Scenario: First user-created group gets palette index 1

- **WHEN** only the default "General" group exists
- **AND** the user creates a new group
- **THEN** the new group's color is palette index 1 (not index 0)

## MODIFIED Requirements

### Requirement: Default group exists on fresh install

The system SHALL create a single default group named "General" when no groups exist. The default group SHALL use a fixed red color (palette index 0).

#### Scenario: Fresh install has default group

- **WHEN** the app loads with no data in localStorage
- **THEN** a default group "General" is created with the fixed red color `oklch(0.545 0.185 28)`

### Requirement: User can create a group

The system SHALL allow users to create new groups with a name and auto-assigned color from a 16-color palette. The auto-assigned color SHALL skip the palette index reserved for General (index 0).

#### Scenario: Create group in settings

- **WHEN** user types a name in the "Add group" input and clicks Add
- **THEN** a new group is created with the given name and an auto-assigned color from palette indices 1–15

## REMOVED Requirements

_None._
