## Purpose

Organize tasks into named groups with auto-assigned colors. Group UI is progressively disclosed — hidden when only one group exists.

## Requirements

### Requirement: Default group exists on fresh install

The system SHALL create a single default group named "General" when no groups exist.

#### Scenario: Fresh install has default group

- **WHEN** the app loads with no data in localStorage
- **THEN** a default group "General" is created with a random color

### Requirement: Group UI is hidden with one group

The system SHALL hide all group-related UI (tags, pickers, lens) when exactly one group exists.

#### Scenario: Single group hides group UI

- **WHEN** only one group exists
- **THEN** no group tags appear on task rows and no group lens appears in the nav

### Requirement: Group tags appear with 2+ groups

The system SHALL show a small colored dot + group name on each task row when two or more groups exist.

#### Scenario: Group tags appear after second group created

- **WHEN** a second group is created
- **THEN** a group tag (color dot + name) appears on each task row

### Requirement: User can create a group

The system SHALL allow users to create new groups with a name and auto-assigned color.

#### Scenario: Create group in settings

- **WHEN** user types a name in the "Add group" input and clicks Add
- **THEN** a new group is created with the given name and a random color

### Requirement: User can rename a group

The system SHALL allow users to rename existing groups.

#### Scenario: Rename group

- **WHEN** user edits a group name in settings
- **THEN** the group name is updated for all tasks assigned to it

### Requirement: User can delete a group with task resolution

The system SHALL require resolution of the group's tasks when deleting a group. The last remaining group cannot be deleted.

#### Scenario: Delete group with tasks

- **WHEN** user deletes a group that has tasks
- **THEN** a prompt asks to either delete all tasks in the group or move them to the default group

#### Scenario: Cannot delete last group

- **WHEN** only one group exists
- **THEN** the delete button for that group is disabled

### Requirement: Quick-add group chip

The system SHALL show a group chip on the add-task row when 2+ groups exist, showing the target group with a picker.

#### Scenario: Group chip visible on add row

- **WHEN** user focuses the add-task input and 2+ groups exist
- **THEN** a group chip shows next to the input with the current target group

#### Scenario: Change group via add chip

- **WHEN** user clicks the group chip on the add row
- **THEN** a dropdown appears with all groups to select from

### Requirement: Default group identifier has a single canonical declaration

The string `'default'` is the identifier of the seeded "General" group and is the fallback used when a task references an unknown group. This string SHALL be declared exactly once, exported from `src/features/groups/store.ts` as `export const DEFAULT_GROUP_ID`, and re-exported from the `features/groups` barrel. No other file in `src/` SHALL declare `const DEFAULT_GROUP_ID` or hard-code the literal `'default'` as a group identifier in production code. Test fixtures and the import path's reference-reassignment default are exempt — they may use the literal because the _canonical declaration_ is the source of the value.

Consumers that need the default-group identifier SHALL import it from `@/features/groups`.

#### Scenario: A consumer imports the canonical default-group id

- **WHEN** `src/features/tasks/store.ts` needs the default group identifier
- **THEN** the file imports `DEFAULT_GROUP_ID` from `@/features/groups`
- **AND** the file does NOT declare its own `const DEFAULT_GROUP_ID`

#### Scenario: A component hard-codes the literal

- **WHEN** `src/features/groups/components/GroupSettingsPanel.tsx` reassigns tasks to the default group on group deletion
- **THEN** the code uses the imported `DEFAULT_GROUP_ID`, not the bare literal `'default'`

#### Scenario: A future change to the default-group id flows through one place

- **WHEN** the default-group identifier is changed from `'default'` to something else
- **THEN** the only edit required is the declaration in `src/features/groups/store.ts`
- **AND** every consumer that imports `DEFAULT_GROUP_ID` is updated by a typecheck + tsc error pointing at the import

### Requirement: Header does not render the group lens

The `App` shell SHALL NOT render the `<GroupLens />` component in the header. The header's right-side controls consist of the settings button only. The `GroupLens` component file (`src/features/groups/components/GroupLens.tsx`) is retained for future use; it is just not mounted in the current shell.

#### Scenario: The header has no group-lens dropdown

- **WHEN** the user opens the app
- **THEN** the header's right-side controls contain only the settings (gear) button
- **AND** no group-lens dropdown is visible
- **AND** no group-lens DOM node is mounted (verified by `document.querySelector` returning null)
