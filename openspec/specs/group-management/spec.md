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
