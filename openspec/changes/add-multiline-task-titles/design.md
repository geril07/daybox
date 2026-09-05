## Context

`AddTaskRow` and `TaskRow` use single-line inputs. Quick-add uses a native form; inline editing saves on Enter or blur and cancels on Escape. Titles are trimmed strings limited to 280 characters, so the data model already supports internal newlines.

`LinkifiedText` renders task titles in task rows, `TaskActionSheet`, and `TimerBar`. The timer title currently uses truncation. Quick-add's trailing `#group` regular expression does not match multiline title content.

## Goals / Non-Goals

**Goals:** Let users insert deliberate line breaks in the existing title, keep those breaks visible, and retain quick keyboard submission and safe clickable links.

**Non-Goals:** A description field, rich text, Markdown, link shortening, text collapse, a higher character limit, or unrelated group-suggestion work.

## Decisions

### Use native textareas for task entry and editing

Use a one-row textarea that grows with its content and wraps naturally. Keep native selection, paste, and accessibility behavior; do not use contenteditable or introduce an editor library. Give the controls accessible names and a discoverable Shift+Enter hint.

Shift+Enter inserts a newline without submitting or saving. Plain Enter prevents the default newline and invokes the existing action. For quick-add, request native form submission so keyboard and submit-button paths use the same submit handler. Do not submit or save while an IME composition is active. Preserve blur-to-save and Escape-to-cancel for inline edits; cancellation must not be undone by blur.

Retain the mobile Add task button and inline blur saving. Test software-keyboard behavior rather than assuming desktop event behavior is identical.

When inline editing starts from a normal title-text click, use the browser caret-position API to map the click point to a character offset in the rendered title, including text split across linkification spans. Place the textarea caret at that offset after mounting. If the browser cannot resolve a position, place the caret at the end. Link clicks remain excluded from inline editing.

### Keep one title string and existing validation

Store internal newlines in `title`. Continue trimming outer whitespace and enforcing the 280-character limit, including newline characters. Pasting multiple lines creates one task, not several. No new schema field or migration is needed. Failed validation must not clear the quick-add draft or silently close an invalid edit.

### Preserve line breaks in all task-title displays

Apply whitespace-preserving wrapping at task-title containers. Keep the existing URL tokenizer and safe link behavior. Remove conflicting title truncation in the timer bar and allow its layout to grow. Do not change unrelated shared text rendering globally merely to style task titles.

Normal wrapping remains enabled, including long URL wrapping. No line clamp, ellipsis, or collapsed state is added.

Use the same integer `19px` line height for the rendered title and textarea. `scrollHeight` is integer-valued while rendered boxes can be fractional with the previous `19.25px` line height; matching integer line boxes prevents a one-pixel edit-mode shift without a fragile height correction.

### Preserve trailing group syntax across multiple lines

Update trailing `#group` parsing to accept a title prefix containing newlines while preserving existing assignment precedence. Only the trailing suffix is consumed; internal line breaks and non-suffix text remain part of the title. This change does not implement currently specified but absent group-suggestion UI.

## Risks / Trade-offs

- Taller task rows and timer titles use more space → This is intentional; verify narrow layouts, controls, and drag handles with multiline content.
- Switching to textarea removes implicit Enter submission → Route plain Enter through the form and test single submission, Shift+Enter, and composition.
- Existing specs describe group suggestions not present in the inspected quick-add component → Preserve any suggestion behavior present at implementation time; Shift+Enter must insert a newline, not accept a suggestion. Do not expand this change to build missing suggestions.
- Mobile keyboards can differ from desktop keyboards → Verify native textarea editing and touch submission in a browser; report any unverified device behavior.

## Migration Plan

No data migration or new dependency is expected. Verify persistence and JSON export/import preserve internal newlines. Rolling back the UI leaves valid string data intact, but old single-line editors cannot safely edit multiline titles.

## Open Questions

None for scope. Textarea sizing and narrow timer layout need browser verification during implementation.
