## 1. Tokenizer

- [x] 1.1 Create `src/shared/utils/linkify.ts` exporting `tokenize(input: string): Token[]` and the `Token` type, with the liberal regex, `new URL()` strict gate, trailing-punctuation strip, unbalanced-paren trim, and dangerous-scheme block per the design.
- [x] 1.2 Create `src/shared/utils/linkify.test.ts` covering: happy path (single URL + surrounding text), no URL (all text), `javascript:` demoted to text, `data:` demoted to text, trailing `.` excluded, balanced parens retained, unbalanced trailing `)` excluded, IDN host (`https://例え.jp/`), multiple URLs in one title.

## 2. React component

- [x] 2.1 Create `src/shared/ui/LinkifiedText.tsx` exporting a default `LinkifiedText({ text }: { text: string })` component that maps tokens to JSX, with `target="_blank" rel="noopener noreferrer"`, Tailwind link styling, `break-all` on the anchor, `focus-visible` outline, and `onClick` `stopPropagation`.
- [x] 2.2 Create `src/shared/ui/LinkifiedText.test.tsx` covering: renders a URL as a link with the correct `href`/`target`/`rel`, preserves surrounding text as plain text spans, does not render an anchor when the input has no URL, does not render an anchor for `javascript:`.

## 3. Barrel and inventory

- [x] 3.1 Add `export { LinkifiedText } from './LinkifiedText';` (or equivalent) to `src/shared/ui/index.ts`.
- [x] 3.2 Add a `LinkifiedText` row to the `Component availability` table in `openspec/specs/shared-ui/spec.md`.

## 4. Integration

- [x] 4.1 In `src/modules/tasks/components/TaskRow.tsx`, replace the plain `{task.title}` text run (line ~139) with `<LinkifiedText text={task.title} />`. Leave the edit-mode `<input>` (line ~120-130) unchanged.
- [x] 4.2 In `src/modules/tasks/components/TaskActionSheet.tsx`, replace `<SheetTitle>{task.title}</SheetTitle>` (line ~38) with `<SheetTitle><LinkifiedText text={task.title} /></SheetTitle>`.
- [x] 4.3 In `src/modules/timer/components/TimerBar.tsx`, replace the plain `{focusedTask.title}` text run in the focused-task span (line ~316-323) with `<LinkifiedText text={focusedTask.title} />`. Leave the tooltip string at line ~102 as a plain string.

## 5. Verification

- [x] 5.1 Run `npm run format`.
- [x] 5.2 Run `npm run typecheck`.
- [x] 5.3 Run `npm run lint`.
- [x] 5.4 Run `npm run test` (or `npx vitest run` for a single pass) and confirm all new and existing tests pass.
