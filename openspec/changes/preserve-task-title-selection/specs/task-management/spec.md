## ADDED Requirements

### Requirement: Preserve selection when title editing starts

The system SHALL transfer a non-collapsed text selection contained within one task title into the inline textarea, preserving its characters and direction. Ordinary clicks SHALL retain clicked-caret behavior. Ordinary link clicks SHALL retain navigation. Selections spanning task rows SHALL NOT start editing.

#### Scenario: Drag to select title text

- **WHEN** the user drags to select text within a task title and releases the mouse, including outside the title bounds
- **THEN** the textarea opens with the same text selected
- **AND** typing replaces only that selection

#### Scenario: Backward or multiline selection

- **WHEN** the user selects title text backwards or across newlines and link nodes
- **THEN** the textarea preserves the selected characters and direction

#### Scenario: Ordinary click

- **WHEN** the user clicks title text without selecting a range
- **THEN** editing starts with the caret at the clicked position

#### Scenario: Link navigation

- **WHEN** the user clicks a title link without selecting text
- **THEN** the link opens without entering edit mode

#### Scenario: Cross-row selection

- **WHEN** the user selects text across multiple task rows
- **THEN** the native page selection remains and no title editor opens
