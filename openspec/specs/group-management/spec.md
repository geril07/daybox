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

The system SHALL require resolution of the group's tasks before deleting a group that contains at least one task. When the group contains no tasks, the system SHALL delete the group immediately without prompting. The last remaining group cannot be deleted.

#### Scenario: Delete group with tasks

- **WHEN** user clicks the delete button on a group that has one or more tasks
- **THEN** a prompt anchored to the delete button asks the user to choose between moving the tasks to the default group or deleting all tasks in the group
- **AND** the prompt also offers a way to cancel without deleting the group
- **AND** the prompt displays the affected task count

#### Scenario: Delete empty group skips the prompt

- **WHEN** user clicks the delete button on a group that has zero tasks
- **THEN** the group is deleted immediately
- **AND** no prompt is shown

#### Scenario: Cancel during prompt leaves state unchanged

- **WHEN** the resolution prompt is open and the user cancels (explicit cancel control, click-outside, or Escape)
- **THEN** no group is deleted
- **AND** no tasks are moved or deleted

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

The string `'default'` is the identifier of the seeded "General" group and is the fallback used when a task references an unknown group. This string SHALL be declared exactly once, exported from `src/modules/groups/store.ts` as `export const DEFAULT_GROUP_ID`, and re-exported from the `modules/groups` barrel. No other file in `src/` SHALL declare `const DEFAULT_GROUP_ID` or hard-code the literal `'default'` as a group identifier in production code. Test fixtures and the import path's reference-reassignment default are exempt — they may use the literal because the _canonical declaration_ is the source of the value.

Consumers that need the default-group identifier SHALL import it from `@/modules/groups`.

#### Scenario: A consumer imports the canonical default-group id

- **WHEN** `src/modules/tasks/store.ts` needs the default group identifier
- **THEN** the file imports `DEFAULT_GROUP_ID` from `@/modules/groups`
- **AND** the file does NOT declare its own `const DEFAULT_GROUP_ID`

#### Scenario: A component hard-codes the literal

- **WHEN** `src/modules/groups/components/GroupSettingsPanel.tsx` reassigns tasks to the default group on group deletion
- **THEN** the code uses the imported `DEFAULT_GROUP_ID`, not the bare literal `'default'`

#### Scenario: A future change to the default-group id flows through one place

- **WHEN** the default-group identifier is changed from `'default'` to something else
- **THEN** the only edit required is the declaration in `src/modules/groups/store.ts`
- **AND** every consumer that imports `DEFAULT_GROUP_ID` is updated by a typecheck + tsc error pointing at the import

### Requirement: Header does not render the group lens

The `App` shell SHALL NOT render the `<GroupLens />` component in the header. The header's right-side controls consist of the settings button only. The `GroupLens` component file (`src/modules/groups/components/GroupLens.tsx`) is retained for future use; it is just not mounted in the current shell.

#### Scenario: The header has no group-lens dropdown

- **WHEN** the user opens the app
- **THEN** the header's right-side controls contain only the settings (gear) button
- **AND** no group-lens dropdown is visible
- **AND** no group-lens DOM node is mounted (verified by `document.querySelector` returning null)

### Requirement: Default group cannot be deleted

The system SHALL prevent deletion of the seeded default group (identified by `DEFAULT_GROUP_ID`). This rule SHALL be enforced both at the UI affordance level and at the group-store action level, so that the default group remains the safe fallback target for orphaned task references regardless of how deletion is invoked.

#### Scenario: Default group's delete button is disabled

- **WHEN** the group settings panel renders the default group's row
- **THEN** its delete button is disabled

#### Scenario: Store refuses to delete the default group

- **WHEN** `useGroupStore.deleteGroup` is called with `DEFAULT_GROUP_ID`
- **THEN** the groups list is unchanged
- **AND** no error is thrown

### Requirement: Group deletion routes through the bulk task helpers

The system SHALL resolve a group's tasks during deletion by invoking the canonical bulk helpers in `task-management`, never by iterating per-task. Specifically:

- If the user chooses to move tasks to the default group, the implementation SHALL invoke `useTaskStore.reassignTasks(groupId, DEFAULT_GROUP_ID)` exactly once.
- If the user chooses to delete all tasks in the group, the implementation SHALL invoke `useTaskStore.deleteTasksByGroupId(groupId)` exactly once.

The implementation SHALL NOT iterate per-task to call `updateTask` or `deleteTask` for these resolutions. This rule exists because the bulk helpers carry the focused-task cascade behavior defined in `task-management`, and per-task callers would bypass it.

#### Scenario: Move uses `reassignTasks` exactly once

- **WHEN** the user deletes a group with tasks and chooses "Move tasks to General"
- **THEN** `useTaskStore.reassignTasks(groupId, DEFAULT_GROUP_ID)` is invoked exactly once
- **AND** no per-task `updateTask` calls occur for the moved tasks

#### Scenario: Delete-all uses `deleteTasksByGroupId` exactly once

- **WHEN** the user deletes a group with tasks and chooses "Delete all tasks"
- **THEN** `useTaskStore.deleteTasksByGroupId(groupId)` is invoked exactly once
- **AND** no per-task `deleteTask` calls occur for the deleted tasks

### Requirement: Group deletion preserves focus on moved tasks and clears focus on deleted tasks

The system SHALL surface the focused-task cascade defined in `task-management` at the user-visible group-deletion boundary with the following guarantees:

- When the user moves the tasks of the focused group to the default group during deletion, `useTimerStore.focusedTaskId` SHALL remain pointing at the (relocated) focused task.
- When the user deletes all tasks of the focused group during deletion, `useTimerStore.focusedTaskId` SHALL become `null` because the focused task no longer exists.
- When the user deletes a group that does not contain the focused task, `useTimerStore.focusedTaskId` SHALL remain unchanged.

#### Scenario: Moving the focused task's group preserves focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Move tasks to General"
- **THEN** task `'t-1'` now has `groupId: DEFAULT_GROUP_ID`
- **AND** `useTimerStore.focusedTaskId` remains `'t-1'`

#### Scenario: Deleting the focused task's group clears focus

- **WHEN** the focused task is `'t-1'` with `groupId: 'work'`
- **AND** the user deletes group `'work'` choosing "Delete all tasks"
- **THEN** task `'t-1'` no longer exists
- **AND** `useTimerStore.focusedTaskId` is `null`

#### Scenario: Deleting an unfocused group leaves focus alone

- **WHEN** the focused task is `'t-1'` with `groupId: 'home'`
- **AND** the user deletes group `'work'` (which does not contain `'t-1'`)
- **THEN** `useTimerStore.focusedTaskId` remains `'t-1'`
