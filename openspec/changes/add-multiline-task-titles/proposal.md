## Why

Task entry is single-line, so users cannot choose where text or a link starts on a new line. Allow deliberate line breaks without adding a separate description field.

## What Changes

- Allow multiline text when adding and editing a task: Shift+Enter inserts a line break; Enter adds or saves.
- Start inline editing with the caret near the clicked position in the task title.
- Preserve internal line breaks in storage and task-title displays, while retaining normal wrapping and clickable links.
- Keep the existing title field, 280-character limit, whitespace trimming, group assignment, blur-to-save, and Escape-to-cancel behavior.
- Do not add descriptions, rich text, shortened link labels, or collapsed text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-management`: Support explicit line breaks in task entry, inline editing, and title display.

## Impact

- Task quick-add and inline-edit components and tests.
- Task-title display in task rows, the task action sheet, and the timer bar.
- Group suffix parsing must accept multiline title content.
- Existing string storage supports newlines; no schema migration or new dependency is expected.
