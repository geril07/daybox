## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Default group cannot be deleted

The system SHALL prevent deletion of the seeded default group (identified by `DEFAULT_GROUP_ID`). This rule SHALL be enforced both at the UI affordance level and at the group-store action level, so that the default group remains the safe fallback target for orphaned task references regardless of how deletion is invoked.

#### Scenario: Default group's delete button is disabled

- **WHEN** the group settings panel renders the default group's row
- **THEN** its delete button is disabled

#### Scenario: Store refuses to delete the default group

- **WHEN** `useGroupStore.deleteGroup` is called with `DEFAULT_GROUP_ID`
- **THEN** the groups list is unchanged
- **AND** no error is thrown
