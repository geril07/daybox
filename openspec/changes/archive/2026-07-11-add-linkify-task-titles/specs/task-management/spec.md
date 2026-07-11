## ADDED Requirements

### Requirement: Task titles auto-detect URLs and render them as clickable external links

The system SHALL render a task's title in the UI by passing the title string through a
linkification step. Any substring matching an `http://` or `https://` URL SHALL be
rendered as an anchor element (`<a>`) with `target="_blank"`, `rel="noopener
noreferrer"`, and visible underline styling. The non-URL portions of the title SHALL
render as plain text. URLs whose scheme is `javascript:`, `data:`, `vbscript:`, or
`file:` SHALL render as plain text (no anchor).

A URL candidate is a substring beginning with `http://` or `https://` and continuing
to the first whitespace or HTML-significant character. The string SHALL be validated
by passing it through the `URL` constructor; if construction throws, the candidate
SHALL render as plain text. Trailing punctuation characters (`.`, `,`, `;`, `:`, `!`,
`?`) and unbalanced trailing closing parentheses SHALL be stripped from the link's
display and `href` before rendering.

This requirement applies to every UI surface that displays a task's title text: the
planner list (`TaskRow`), the mobile action sheet header (`TaskActionSheet`), and the
timer bar's focused-task display (`TimerBar`). The `TaskRow` edit mode (an `<input>`
element) is NOT subject to this requirement — text-entry fields render plain text.

#### Scenario: A URL in a title renders as a clickable external link

- **WHEN** a task with title `Review https://github.com/owner/repo/pull/123` is
  displayed in the planner list
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://github.com/owner/repo/pull/123`
- **AND** the anchor's `target` is `_blank`
- **AND** the anchor's `rel` is `noopener noreferrer`
- **AND** the surrounding text `Review ` and any text after the URL renders as a
  plain text run, not as an anchor

#### Scenario: A title with no URL renders as plain text

- **WHEN** a task with title `Write quarterly report` is displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title renders as a plain text run

#### Scenario: A `javascript:` URL renders as plain text

- **WHEN** a task with title `click javascript:alert(1) now` is displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title `click javascript:alert(1) now` renders as a plain text
  run

#### Scenario: A `data:` URL renders as plain text

- **WHEN** a task with title `download data:text/html,<script>...</script>` is
  displayed
- **THEN** the rendered title contains zero anchor elements
- **AND** the entire title renders as a plain text run

#### Scenario: Trailing punctuation is excluded from the link

- **WHEN** a task with title `See https://example.com.` is displayed
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://example.com` (no trailing `.`)
- **AND** the visible link text is `https://example.com`
- **AND** the trailing `.` is rendered as a plain text run after the anchor

#### Scenario: Balanced parens inside a URL are kept; unbalanced trailing parens are not

- **WHEN** a task with title `(see https://en.wikipedia.org/wiki/Foo_(bar))` is
  displayed
- **THEN** the rendered title contains exactly one anchor element
- **AND** the anchor's `href` is `https://en.wikipedia.org/wiki/Foo_(bar)`
- **AND** the visible link text is `https://en.wikipedia.org/wiki/Foo_(bar)`
- **AND** the leading `(` and trailing `)` are rendered as plain text runs

#### Scenario: A click on a link inside a task row does not start inline title editing

- **WHEN** a task row is rendered with a link in the title
- **AND** the user clicks the link
- **THEN** the browser opens the link in a new tab
- **AND** the task row's inline edit mode is NOT activated
