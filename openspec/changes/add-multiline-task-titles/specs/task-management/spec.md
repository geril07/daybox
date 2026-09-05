## ADDED Requirements

### Requirement: Task titles support explicit line breaks

The system SHALL support internal line breaks in the existing task title during quick-add and inline editing. Both controls SHALL support multiline text and grow to show their content. Shift+Enter SHALL insert a line break at the selection without creating a task, saving an edit, or accepting a group suggestion. Plain Enter SHALL retain the existing add/save behavior, subject to existing group-suggestion acceptance behavior. Enter used during IME composition SHALL NOT add or save a task.

Quick-add keyboard submission SHALL use the native form submission path. Inline editing SHALL retain blur-to-save and Escape-to-cancel behavior. Controls SHALL have accessible names and a discoverable Shift+Enter hint.

Titles SHALL retain internal line breaks in storage, including through persistence and JSON export/import. Existing outer-whitespace trimming and the 280-character limit SHALL remain; newline characters SHALL count toward the limit. Pasted multiline text SHALL be treated as one task title. A rejected submission or edit SHALL keep the draft available for correction.

#### Scenario: Add a task with an explicit line break

- **WHEN** the user types `Review proposal`, presses Shift+Enter, and types `https://example.com/proposal` in quick-add
- **THEN** the draft contains the two lines and no task has been created
- **WHEN** the user presses plain Enter with no highlighted group suggestion
- **THEN** exactly one task is created with both lines in its title
- **AND** the input is cleared after successful creation

#### Scenario: Edit a task with an explicit line break

- **WHEN** the user opens inline editing and inserts a line break with Shift+Enter
- **THEN** editing remains open and the stored title is unchanged
- **WHEN** the user presses plain Enter or blurs the control with a valid draft
- **THEN** the complete multiline title is saved

#### Scenario: Cancel a multiline edit

- **WHEN** the user changes a title to multiple lines and presses Escape
- **THEN** the original title is restored
- **AND** subsequent blur does not save the cancelled draft

#### Scenario: Composition does not submit

- **WHEN** Enter is pressed while IME composition is active in quick-add or inline editing
- **THEN** the task is not created and the edit is not saved

#### Scenario: Paste multiple lines

- **WHEN** the user pastes a two-line title into quick-add and submits it
- **THEN** one task is created with its internal line break intact

#### Scenario: Multiline title retains group assignment syntax

- **WHEN** the user submits `Review proposal\nCheck examples #work`, where `\n` represents a line break
- **THEN** one task is created with title `Review proposal\nCheck examples`
- **AND** the task is assigned to `work` using existing group lookup or creation rules
- **AND** the explicit group overrides the active sidebar group lens

#### Scenario: Existing title validation applies

- **WHEN** a multiline title exceeds 280 characters or contains only whitespace
- **THEN** creation or update is rejected without changing stored tasks
- **AND** the draft remains available for correction

#### Scenario: Multiline text survives persistence and portability

- **WHEN** a task with internal line breaks is persisted and reloaded, or exported and imported as JSON
- **THEN** its title retains the same internal line breaks

#### Scenario: Touch submission retains multiline content

- **WHEN** a user enters a valid multiline title on a coarse-pointer device and taps Add task
- **THEN** exactly one task is created with the complete multiline title

### Requirement: Task title displays preserve explicit line breaks

Task rows, the task action sheet header, and the focused task title in the timer bar SHALL display stored internal line breaks. Text SHALL also wrap normally to the available width. These displays SHALL NOT shorten links, truncate titles, clamp lines, or hide text behind an expansion control. Existing URL detection, safe external-link attributes, and link-click isolation SHALL remain unchanged.

#### Scenario: Display a deliberate line break

- **WHEN** a title containing `Review proposal\nhttps://example.com/proposal` is shown in a task row, task action sheet, or timer bar
- **THEN** the URL begins on a new line after `Review proposal`
- **AND** the URL remains a clickable external link

#### Scenario: Long text still wraps

- **WHEN** a title line or URL exceeds the available width
- **THEN** it wraps without horizontal overflow or shortened text
- **AND** other task and timer controls remain usable

#### Scenario: Link clicks do not activate editing

- **WHEN** the user clicks a URL on a new line in a task row
- **THEN** the URL opens using the existing external-link behavior
- **AND** inline editing does not start
