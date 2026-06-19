## ADDED Requirements

### Requirement: Sidebar Groups section is always visible

The system SHALL always render the sidebar `Groups` section, including its title row with the `+` add affordance, regardless of group count. The `All groups` filter item SHALL appear only when two or more groups exist; with exactly one group, the section shows the single group row directly.

#### Scenario: One group shows the section without "All groups"

- **WHEN** only the default "General" group exists
- **THEN** the sidebar renders the `Groups` section
- **AND** the section shows the `General` row
- **AND** the `All groups` filter item is not rendered
- **AND** the section's `+` add affordance is rendered

#### Scenario: Multiple groups show the section with "All groups"

- **WHEN** two or more groups exist
- **THEN** the sidebar renders the `Groups` section
- **AND** the section shows the `All groups` filter item as the first row
- **AND** each existing group appears as a row after `All groups`
- **AND** the section's `+` add affordance is rendered

### Requirement: Sidebar hosts group CRUD

The system SHALL provide create, rename, change-color, and delete operations for groups through the sidebar's `Groups` section. The settings drawer SHALL NOT host group CRUD. Each group row SHALL expose the following interactions:

- Clicking the row body (not the color dot, not the `⋮` button) sets the active group lens to that group, identical to the existing lens behavior.
- Clicking the colored dot opens the color picker popover.
- Clicking the `⋮` button opens a menu with `Change color`, `Rename`, and `Delete` items, each rendered with a leading icon (`Palette`, `Pencil`, `Trash2`).
- The `⋮` button SHALL be visible on hover (desktop) and SHALL always be visible on coarse pointers (touch), matching the existing `TaskRow` drag-handle pattern.

The settings drawer SHALL NOT render a `Groups` section, a group create input, a group rename control, a group color picker, or a group delete control.

#### Scenario: Add group via transient input

- **WHEN** the user clicks the `+` button in the `Groups` section title row
- **THEN** a transient add input appears at the bottom of the section
- **AND** the input receives focus

#### Scenario: Add group submits on Enter

- **WHEN** the transient add input is open
- **AND** the user types a name and presses Enter
- **THEN** a new group is created with the given name
- **AND** the input closes

#### Scenario: Add group submits on blur when non-empty

- **WHEN** the transient add input contains a non-empty name
- **AND** the input loses focus (without clicking Cancel)
- **THEN** a new group is created with the given name
- **AND** the input closes

#### Scenario: Add group closes without creating on empty blur

- **WHEN** the transient add input is empty or contains only whitespace
- **AND** the input loses focus
- **THEN** no new group is created
- **AND** the input closes

#### Scenario: Add group closes without creating on Escape

- **WHEN** the transient add input is open and contains text
- **AND** the user presses Escape
- **THEN** no new group is created
- **AND** the input closes

#### Scenario: Rename via `⋮` menu

- **WHEN** the user clicks the `⋮` button on a group row
- **AND** selects `Rename` from the menu
- **THEN** the group row's name becomes an inline text input
- **WHEN** the user presses Enter in the inline input
- **THEN** the new name is saved
- **WHEN** the user presses Escape in the inline input
- **THEN** the prior name is restored

#### Scenario: Change color via color dot

- **WHEN** the user clicks the colored dot on a group row
- **THEN** the color picker popover opens anchored to the dot

#### Scenario: Change color via `⋮` menu

- **WHEN** the user selects `Change color` from the `⋮` menu
- **THEN** the color picker popover opens

#### Scenario: Delete empty group via `⋮` menu skips the resolve prompt

- **WHEN** the user selects `Delete` from the `⋮` menu on a group with zero tasks
- **THEN** the group is deleted immediately
- **AND** no resolve prompt is shown

#### Scenario: Delete non-empty group via `⋮` menu shows the resolve prompt

- **WHEN** the user selects `Delete` from the `⋮` menu on a group with one or more tasks
- **THEN** the resolve prompt opens anchored to the `⋮` button with `align="end"`
- **AND** the prompt offers `Move tasks to General`, `Delete all tasks`, and `Cancel`

#### Scenario: Clicking `⋮` or color dot does not change the lens

- **WHEN** the user clicks the `⋮` button on a group row
- **OR** the user clicks the colored dot on a group row
- **THEN** the active group lens is unchanged

## MODIFIED Requirements

### Requirement: Task-row group tag and add-row group chip are hidden with one group

The system SHALL hide the task-row group tag (the small colored dot + name rendered on each task row) and the add-row group chip when exactly one group exists. The sidebar `Groups` section is NOT covered by this requirement; it is governed by its own requirement.

#### Scenario: Single group hides the task-row group tag

- **WHEN** only one group exists
- **THEN** no group tag appears on any task row

#### Scenario: Single group hides the add-row group chip

- **WHEN** only one group exists
- **THEN** no group chip appears on the add-task row

#### Scenario: Group tag and add-row chip appear after second group

- **WHEN** a second group is created
- **THEN** a group tag appears on each task row
- **AND** the add-row group chip appears

### Requirement: Group tags appear with 2+ groups

The system SHALL show a small colored dot + group name on each task row when two or more groups exist.

#### Scenario: Group tags appear after second group created

- **WHEN** a second group is created
- **THEN** a group tag (color dot + name) appears on each task row

### Requirement: User can create a group

The system SHALL allow users to create new groups with a name and auto-assigned color from a 16-color palette. The auto-assigned color SHALL skip the palette index reserved for General (index 0). Creation happens through the sidebar's `Groups` section via a transient add input triggered by the `+` affordance.

#### Scenario: Create group from the sidebar

- **WHEN** the user opens the transient add input by clicking the `+` button
- **AND** types a name and presses Enter
- **THEN** a new group is created with the given name and an auto-assigned color from palette indices 1–15

### Requirement: User-created groups never collide with General's color

The system SHALL exclude General's palette color (index 0) from the auto-assignment pool when creating new groups.

#### Scenario: First user-created group gets palette index 1

- **WHEN** only the default "General" group exists
- **AND** the user creates a new group
- **THEN** the new group's color is palette index 1 (not index 0)

#### Scenario: Sixteenth user-created group does not get red

- **WHEN** the default "General" group exists (color index 0)
- **AND** 15 user-created groups exist (occupying palette indices 1–15)
- **AND** the user creates a 16th group
- **THEN** the new group wraps to palette index 1 (not index 0)

### Requirement: User can change a group's color

The system SHALL allow users to change the color of any group (including General) via a color picker. The color picker is reachable two ways from the sidebar: directly by clicking the colored dot on a group row, or via `Change color` in the `⋮` menu. The picker offers a grid of 16 palette swatches and a native color input.

#### Scenario: Change group color via dot in the sidebar

- **WHEN** user clicks the colored dot on a group row in the sidebar
- **THEN** a popover opens with a grid of 16 palette swatches and a native color input
- **AND** the group's current color dot highlights the matching swatch with a ring (if it is a palette color)
- **AND** clicking a swatch updates the group's color and closes the popover

#### Scenario: Change group color via native color input

- **WHEN** user clicks the native color input in the color popover
- **AND** selects a custom color from the browser's dialog
- **THEN** the group's color is updated to the chosen hex value
- **AND** the color dot reflects the new custom color

#### Scenario: Color change persists across sessions

- **WHEN** user changes a group's color
- **THEN** the new color is persisted in localStorage under the `daybox-groups` key
- **AND** after a page reload, the group retains the chosen color

### Requirement: User can rename a group

The system SHALL allow users to rename existing groups. Renaming happens through the sidebar: the `⋮` menu's `Rename` item turns the row name into an inline input (Enter saves, Escape cancels).

#### Scenario: Rename group from the sidebar

- **WHEN** user opens the `⋮` menu on a group row
- **AND** selects `Rename`
- **AND** types a new name in the inline input
- **AND** presses Enter
- **THEN** the group name is updated for all tasks assigned to it

#### Scenario: Cancel rename via Escape

- **WHEN** user is editing a group name in the inline input
- **AND** presses Escape
- **THEN** the prior name is restored
- **AND** no rename is persisted

### Requirement: User can delete a group with task resolution

The system SHALL require resolution of the group's tasks before deleting a group that contains at least one task. When the group contains no tasks, the system SHALL delete the group immediately without prompting. The last remaining group cannot be deleted. Deletion is initiated from the sidebar's `⋮` menu's `Delete` item; the resolve prompt is anchored to the row.

#### Scenario: Delete group with tasks

- **WHEN** user selects `Delete` from the `⋮` menu on a group that has one or more tasks
- **THEN** a prompt anchored to the `⋮` button asks the user to choose between moving the tasks to the default group or deleting all tasks in the group
- **AND** the prompt also offers a way to cancel without deleting the group
- **AND** the prompt displays the affected task count

#### Scenario: Delete empty group skips the prompt

- **WHEN** user selects `Delete` from the `⋮` menu on a group that has zero tasks
- **THEN** the group is deleted immediately
- **AND** no prompt is shown

#### Scenario: Cancel during prompt leaves state unchanged

- **WHEN** the resolution prompt is open and the user cancels (explicit cancel control, click-outside, or Escape)
- **THEN** no group is deleted
- **AND** no tasks are moved or deleted

#### Scenario: Cannot delete last group

- **WHEN** only one group exists
- **THEN** the `Delete` item in the `⋮` menu is disabled (or the menu is not shown) for that group

### Requirement: Sidebar provides a group lens

When the sidebar `Groups` section is rendered (governed by the "Sidebar Groups section is always visible" requirement), the first item SHALL be `All groups` when two or more groups exist, followed by the user groups. With exactly one group, `All groups` SHALL be omitted and the single group row SHALL be the only filter target (it shows all tasks, since there is only one group). Selecting `All groups` SHALL set the active group lens to `null`. Selecting a user group SHALL set the active group lens to that group's id.

The selected group lens SHALL remain app-shell runtime state and SHALL NOT be persisted across reloads.

#### Scenario: Sidebar shows all group lens options at 2+ groups

- **WHEN** two or more groups exist
- **THEN** the sidebar's `Groups` section is rendered
- **AND** the first item is `All groups`
- **AND** each existing group appears as a selectable item after `All groups`

#### Scenario: One-group sidebar omits "All groups"

- **WHEN** only one group exists
- **THEN** the sidebar's `Groups` section is rendered
- **AND** the section shows the single group as a selectable item
- **AND** `All groups` is not rendered

#### Scenario: All groups sets null lens

- **WHEN** the user selects `All groups` (only possible when 2+ groups exist)
- **THEN** the active group lens is `null`

#### Scenario: Selecting a group sets concrete lens

- **WHEN** the user selects the `Work` group in the sidebar
- **THEN** the active group lens is `Work`'s group id

#### Scenario: Group lens is not persisted

- **WHEN** the user selects the `Work` group in the sidebar
- **AND** reloads DayBox
- **THEN** the active group lens returns to `All groups`
