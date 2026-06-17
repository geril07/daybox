## MODIFIED Requirements

### Requirement: Group UI is hidden with one group

The system SHALL hide all group-related UI (tags, pickers, lens, and sidebar group section) when exactly one group exists.

#### Scenario: Single group hides group UI

- **WHEN** only one group exists
- **THEN** no group tags appear on task rows
- **AND** no group picker appears on the add row
- **AND** no group lens or `Groups` section appears in the sidebar navigation

### Requirement: Header does not render the group lens

The `App` shell SHALL NOT render the `<GroupLens />` component in the header. The header's right-side controls consist of the settings button only. The group lens MAY be rendered in the sidebar navigation when group UI is eligible to appear.

#### Scenario: The header has no group-lens dropdown

- **WHEN** the user opens the app
- **THEN** the header's right-side controls contain only the settings (gear) button
- **AND** no group-lens dropdown is visible in the header

## ADDED Requirements

### Requirement: Sidebar provides a group lens

When two or more groups exist, the system SHALL render a `Groups` section in the sidebar navigation. The first item SHALL be `All groups`, followed by the user groups. Selecting `All groups` SHALL set the active group lens to `null`. Selecting a user group SHALL set the active group lens to that group's id.

The selected group lens SHALL remain app-shell runtime state and SHALL NOT be persisted across reloads.

#### Scenario: Sidebar shows all group lens options

- **WHEN** two or more groups exist
- **THEN** the sidebar renders a `Groups` section
- **AND** the first item is `All groups`
- **AND** each existing group appears as a selectable item

#### Scenario: All groups sets null lens

- **WHEN** the user selects `All groups`
- **THEN** the active group lens is `null`

#### Scenario: Selecting a group sets concrete lens

- **WHEN** the user selects the `Work` group in the sidebar
- **THEN** the active group lens is `Work`'s group id

#### Scenario: Group lens is not persisted

- **WHEN** the user selects the `Work` group in the sidebar
- **AND** reloads DayBox
- **THEN** the active group lens returns to `All groups`
