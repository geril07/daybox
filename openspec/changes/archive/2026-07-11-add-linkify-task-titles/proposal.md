## Why

Task titles often hold references — docs, repos, jira tickets, meeting links. Today those
URLs are plain text; users have to copy and paste them. Auto-detect `http://` and
`https://` URLs in task titles and render them as clickable external links, so a title
like `Review https://github.com/owner/repo/pull/123` opens in one click.

## What Changes

- Add `src/shared/utils/linkify.ts` — a pure `tokenize(input: string): Token[]` function.
  A liberal regex finds `https?://...` candidates; the `new URL()` constructor is the
  strict gate. Schemes in `{javascript, data, vbscript, file}` are demoted to plain text.
  Trailing punctuation and unbalanced closing parens are trimmed per standard linker
  convention.
- Add `src/shared/ui/LinkifiedText.tsx` — a 12-line presentational mapper from tokens to
  React JSX. Anchors carry `target="_blank" rel="noopener noreferrer"`, Tailwind link
  styling, and `onClick` `stopPropagation` so a click does not also trigger the parent
  row's click handler.
- Re-export `LinkifiedText` from the `src/shared/ui/index.ts` barrel.
- Replace plain `{task.title}` text with `<LinkifiedText text={task.title} />` at three
  sites: `src/modules/tasks/components/TaskRow.tsx`,
  `src/modules/tasks/components/TaskActionSheet.tsx`, and
  `src/modules/timer/components/TimerBar.tsx`.
- The TaskRow edit-mode `<input>` is unchanged — inputs do not render markup; saved
  titles get linkified on display.
- No new runtime dependencies. No state, store, or schema changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-management`: Add a requirement that when a task title is rendered in the UI
  (TaskRow, TaskActionSheet, and any future display site), any `http://` or `https://`
  URL detected in the text is rendered as a clickable external link
  (`target="_blank" rel="noopener noreferrer"`). URLs whose scheme is `javascript:`,
  `data:`, `vbscript:`, or `file:` render as plain text. The task-management delta
  spec lives at `changes/add-linkify-task-titles/specs/task-management/spec.md`.
- `shared-ui`: Add `LinkifiedText` to the shared UI component inventory — a
  presentational component that takes a `text: string` prop and renders the text with
  auto-detected URLs as clickable external links. Re-exported from `@/shared/ui`. The
  shared-ui delta spec lives at
  `changes/add-linkify-task-titles/specs/shared-ui/spec.md`.

## Impact

- New code: 2 files (`src/shared/utils/linkify.ts`, `src/shared/ui/LinkifiedText.tsx`).
- New tests: 2 files (`linkify.test.ts`, `LinkifiedText.test.tsx`).
- Modified code: 3 files
  (`src/modules/tasks/components/TaskRow.tsx`,
  `src/modules/tasks/components/TaskActionSheet.tsx`,
  `src/modules/timer/components/TimerBar.tsx`).
- Modified barrels: 1 (`src/shared/ui/index.ts`).
- Modified specs (delta files): 2
  (`changes/add-linkify-task-titles/specs/task-management/spec.md`,
  `changes/add-linkify-task-titles/specs/shared-ui/spec.md`).
- Runtime dependencies: none new.
- Other systems: none. localStorage schema, store actions, and migration paths are
  unchanged — `LinkifiedText` operates on already-stored title strings at render time.
