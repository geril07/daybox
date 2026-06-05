## ADDED Requirements

### Requirement: Group suggestions appear as a popover anchored to the add-task input

When the user types a `#` character anywhere in the add-task input, the system SHALL display a floating popover anchored to the input element containing up to 5 group suggestions that start with the typed prefix (or the first 5 groups when the prefix is empty). The popover SHALL be a real floating layer (not an inline layout child of the form), SHALL be dismissed on `Escape`, outside click, or selection of a suggestion, and SHALL NOT steal focus from the add-task input at any point (on open, on suggestion click, on accept, on dismiss). When the typed prefix has no matches, the popover SHALL contain a single non-interactive row reading `Press Enter to create group "<query>"`.

#### Scenario: Suggestions popover does not appear without a trailing hash

- **WHEN** the add-task input value is `Write report` (no trailing `#` character)
- **THEN** the suggestions popover is not rendered
- **AND** the form's vertical footprint is the same as it is when no `#` has been typed

#### Scenario: Suggestions popover appears on a trailing hash

- **WHEN** the user types `#` in the add-task input
- **THEN** a popover appears below the input (anchored to the input element, left-aligned with the input's text column)
- **AND** the popover contains up to 5 group suggestions that start with the prefix (or the first 5 groups when the prefix is empty)
- **AND** the suggestions popover does not push surrounding rows down — it overlays them as a floating layer

#### Scenario: Suggestions popover filters by prefix

- **WHEN** the user types `#wo` and a group named `Work` exists
- **THEN** the suggestions popover contains `Work` (assuming it is the only group whose name starts with `wo`)
- **AND** groups whose names do not start with `wo` are not in the popover

#### Scenario: Opening the popover does not move focus from the input

- **WHEN** the add-task input has focus and the user types `#`
- **THEN** the suggestions popover appears
- **AND** focus remains on the add-task input (`document.activeElement` is the input)

#### Scenario: Tab does not enter the suggestions popover

- **WHEN** the add-task input has focus and the suggestions popover is open
- **THEN** pressing `Tab` moves focus to the next focusable element in the page (e.g. the `GroupChip` on the right when 2+ groups exist, or otherwise out of the row)
- **AND** focus does not enter any suggestion inside the popover

#### Scenario: ArrowDown highlights the next suggestion

- **WHEN** the suggestions popover is open and the user presses `ArrowDown`
- **THEN** the highlight moves to the next suggestion in the list (wrapping from the last back to the first)
- **AND** the previously highlighted suggestion loses its visual highlight
- **AND** the newly highlighted suggestion gains a visual highlight
- **AND** focus remains on the add-task input

#### Scenario: ArrowUp highlights the previous suggestion

- **WHEN** the suggestions popover is open and the user presses `ArrowUp`
- **THEN** the highlight moves to the previous suggestion in the list (wrapping from the first back to the last)
- **AND** the previously highlighted suggestion loses its visual highlight
- **AND** the newly highlighted suggestion gains a visual highlight
- **AND** focus remains on the add-task input

#### Scenario: Enter on a highlighted suggestion accepts it

- **WHEN** the suggestions popover is open with a suggestion highlighted and the user presses `Enter`
- **THEN** the input value is rewritten to replace the trailing `#<prefix>` with `#<highlighted-name> ` (note the trailing space)
- **AND** the suggestions popover closes
- **AND** the highlight is cleared
- **AND** focus returns to the add-task input
- **AND** the form does NOT submit (no task is created by the accept)

#### Scenario: Enter with no highlighted suggestion submits the form

- **WHEN** the suggestions popover is open with no suggestion highlighted (e.g. the user has not pressed `ArrowDown`/`ArrowUp` since the popover opened) and the user presses `Enter`
- **THEN** the form submits (a task is created, with the `#<prefix>` parsed per the existing `Create task with #group syntax` requirement)
- **AND** the suggestions popover closes

#### Scenario: Enter with the popover closed submits the form

- **WHEN** the suggestions popover is closed (no trailing `#` in the input) and the user presses `Enter`
- **THEN** the form submits (a task is created)

#### Scenario: Clicking a suggestion rewrites the input and closes the popover

- **WHEN** the suggestions popover is open and the user clicks a suggestion `Work`
- **THEN** the input value is rewritten to replace the trailing `#<prefix>` with `#Work ` (note the trailing space)
- **AND** the suggestions popover closes
- **AND** focus returns to the add-task input

#### Scenario: Press Enter to create group hint

- **WHEN** the user types `#newgroup` and no group named `newgroup` exists
- **THEN** the suggestions popover contains a single non-interactive row reading `Press Enter to create group "newgroup"`
- **AND** clicking the row does nothing (it is not a button)

#### Scenario: Escape dismisses the popover

- **WHEN** the suggestions popover is open and the user presses `Escape`
- **THEN** the popover closes
- **AND** the highlight is cleared
- **AND** focus remains on the add-task input (is not moved to or from any other element)
- **AND** the input value is preserved unchanged (the typed `#<prefix>` is NOT removed)

#### Scenario: Outside click dismisses the popover

- **WHEN** the suggestions popover is open and the user clicks outside both the input and the popover
- **THEN** the popover closes
- **AND** the highlight is cleared
- **AND** focus moves to the clicked element (or is left where it is, per platform convention)
- **AND** the input value is preserved unchanged

#### Scenario: Removing the trailing hash closes the popover

- **WHEN** the suggestions popover is open and the user backspaces the trailing `#` out of the input
- **THEN** the popover closes
- **AND** focus remains on the add-task input
- **AND** the input value reflects the deletion

#### Scenario: Popover is anchored to the input element

- **WHEN** the suggestions popover is open
- **THEN** the popover's position is computed relative to the input element (not relative to the form or the document)
- **AND** the popover is positioned below the input, left-aligned with the input's text column, with a small vertical offset
