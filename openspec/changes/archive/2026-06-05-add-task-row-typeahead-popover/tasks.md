## 1. Shared UI: extend `PopoverContent` to accept an `anchor` prop

- [x] 1.1 In `src/shared/ui/popover.tsx`, extend the `PopoverContent` props type so that it accepts the `anchor` prop from `@base-ui/react`'s `PopoverPositioner` props (type `Element | RefObject<Element | null> | VirtualElement | (() => Element | VirtualElement | null) | null | undefined`). Forward `anchor` from `PopoverContent` to the inner `PopoverPrimitive.Positioner` so the popover positions against the supplied element instead of the (omitted) trigger. The default behavior with no `anchor` prop MUST stay unchanged (popover still portals and animates as before; existing call sites such as the `GroupChip` in `AddTaskRow.tsx` are not affected).

## 2. `AddTaskRow` typeahead: swap the inline `<div>` for a non-focus-hijacking `Popover` with keyboard navigation

- [x] 2.1 In `src/features/tasks/components/AddTaskRow.tsx`, replace the inline `GroupTypeahead` rendering (the block guarded by `showTypeahead` at lines 90–100) with a `Popover` that is fully controlled by `showTypeahead`. Pass `open={showTypeahead}` and `onOpenChange={(open) => { if (!open) setShowTypeahead(false); }}` so dismissals (Escape, outside click) are honored. The popover MUST NOT render a clickable `PopoverTrigger`; the input element is the anchor.
- [x] 2.2 Pass `initialFocus={false}` to `PopoverContent` so that base-ui does NOT move focus to the popup or its first child when the popover opens. The popover is purely a visual layer; focus stays on the add-task input.
- [x] 2.3 Anchor the popover to the input element by passing `anchor={inputRef}` (and `side="bottom"`, `align="start"`, `sideOffset={4}`) to `PopoverContent`. Confirm visually that the popover is positioned directly under the input, left-aligned with the input's text column, and does not push surrounding rows down.
- [x] 2.4 Add `tabIndex={-1}` to the `PopoverContent` wrapper className (or pass it as a prop forwarded to the inner `PopoverPrimitive.Popup` if the wrapper's `Pick` does not already include it) and to each suggestion `Button`. The popup wrapper and suggestion buttons MUST NOT be reachable via `Tab` from the input; navigation in/out of the popover is done with the arrow keys and Escape only.
- [x] 2.5 Move the suggestion-list filtering logic (currently in the body of `GroupTypeahead`) inside the popover's `PopoverContent`. Each suggestion is a `Button` matching the existing visual treatment (color dot + name, `variant="ghost"`, `size="none"`, `rounded-[4px]`, `px-3 py-2`, `text-sm`). The row whose index matches `highlightIndex` gains a visual highlight (e.g. `bg-muted` or `bg-accent/30`); all other rows use the existing flat treatment. On click: rewrite the input value to replace the trailing `#<prefix>` with `#<full-name> `, close the popover (`setShowTypeahead(false)`), clear the highlight, and refocus the input. Up to 5 suggestions are shown.
- [x] 2.6 Add a `highlightIndex: number | null` local state to `AddTaskRow`. It is `null` by default; the first time the popover opens, it remains `null` (no auto-highlight); `ArrowDown`/`ArrowUp` set it; any state change that hides or rebuilds the popover resets it to `null` (e.g. when the trailing `#` is removed, on Escape, on suggestion accept).
- [x] 2.7 Extend the input's `onKeyDown` to handle keyboard navigation:
  - `ArrowDown`: `e.preventDefault()`; if the popover is open, advance `highlightIndex` by 1 with wrap-around (last → first). If `highlightIndex` is `null`, set it to `0`.
  - `ArrowUp`: `e.preventDefault()`; if the popover is open, decrement `highlightIndex` by 1 with wrap-around (first → last). If `highlightIndex` is `null`, set it to the last index.
  - `Enter`: if the popover is open and `highlightIndex` is a valid index in the matched list, `e.preventDefault()`, call the accept path (same as click — rewrite input, close popover, clear highlight, refocus input), and return without calling `handleSubmit`. Otherwise, fall through to the existing `handleSubmit` behavior.
  - `Escape`: if the popover is open, `e.preventDefault()`, set `showTypeahead(false)`, set `highlightIndex(null)`. Otherwise, let the keypress propagate (other Escape handlers in the app still work).
- [x] 2.8 When the typed prefix has no matches, render a single non-interactive row inside the popover content reading `Press Enter to create group "<query>"`. Style it muted (`text-muted-foreground`), full width, `px-3 py-2`, `text-sm`, with a small left padding to match the suggestion rows' text alignment. The row is a `<div>`, not a `Button`. The "no matches" path does not contribute to `highlightIndex` (the hint is not highlightable).
- [x] 2.9 When the input value changes such that `showTypeahead` becomes `false` (e.g. user backspaces past the `#`), reset `highlightIndex` to `null`. Implement this either in the `setShowTypeahead` callsite or in a `useEffect` that depends on `showTypeahead`.
- [x] 2.10 Delete the now-unused inline-typeahead branch of the JSX. Keep the `GroupTypeahead` function (it is now rendered inside the popover content) and `GroupChip` (unchanged). Confirm the file still imports `Popover` / `PopoverContent` from `@/shared/ui`.
- [x] 2.11 Verify the `Enter` key on the input still creates a task when the popover is closed and when the popover is open with no highlight (per the three Enter scenarios in the spec). The accept path (`Enter` on a highlighted suggestion) MUST NOT submit the form.

## 3. Test coverage

- [x] 3.1 Create `src/features/tasks/components/AddTaskRow.test.tsx` (no test file exists for this component today). Use the same `beforeEach` / `afterEach` store-reset pattern as `TaskRow.test.tsx`. Seed `useGroupStore.groups` with at least two groups (e.g. `General` default + `Work`) so the `#` suggestion list has something to filter against.
- [x] 3.2 Add a test asserting the suggestions popover is not in the document when the input value has no trailing `#`.
- [x] 3.3 Add a test asserting the suggestions popover renders when the user types `#` in the input, and contains group names that match the prefix.
- [x] 3.4 Add a test asserting that typing `#wo` (with a `Work` group present) renders only `Work` in the popover and excludes groups that do not start with `wo`.
- [x] 3.5 Add a test asserting that opening the popover (typing `#`) does not move focus from the input (`document.activeElement` is the input after the type).
- [x] 3.6 Add a test asserting that `Tab` from the input does not focus any suggestion inside the popover (suggestion buttons have `tabIndex={-1}`).
- [x] 3.7 Add a test asserting that `ArrowDown` highlights the first suggestion (when no highlight was set), and a second `ArrowDown` advances to the second suggestion. Assert that the visual highlight class is applied to the corresponding `Button` and not to others.
- [x] 3.8 Add a test asserting that `ArrowUp` from no-highlight sets the highlight to the last suggestion; `ArrowUp` from the first wraps to the last.
- [x] 3.9 Add a test asserting that pressing `Enter` with a suggestion highlighted rewrites the input value, closes the popover, clears the highlight, refocuses the input, and does NOT create a task.
- [x] 3.10 Add a test asserting that pressing `Enter` with the popover open but no highlight submits the form (creates a task, with the `#<prefix>` parsed per the existing behavior).
- [x] 3.11 Add a test asserting that pressing `Enter` with the popover closed submits the form (existing behavior, regression guard).
- [x] 3.12 Add a test asserting that clicking a suggestion rewrites the input value, closes the popover, clears the highlight, and refocuses the input.
- [x] 3.13 Add a test asserting that typing `#brandnew` (no matching group) renders the `Press Enter to create group "brandnew"` hint and the hint is not a button.
- [x] 3.14 Add a test asserting that pressing `Escape` while the popover is open closes the popover, clears the highlight, leaves the input value unchanged, and leaves focus on the input.
- [x] 3.15 Add a test asserting that clicking outside the popover and the input dismisses the popover and clears the highlight; the input value is preserved.
- [x] 3.16 Add a test asserting that backspacing past the trailing `#` (e.g. `Buy milk #wo` → `Buy milk #w`) keeps the popover open if a `#` is still present, and closing the popover (e.g. backspacing past the `#` entirely) clears the highlight.
- [x] 3.17 Add a test asserting that submitting the form (Enter) when the input ends with `#brandnew` and the popover is open with no highlight creates a new group with that name and a task assigned to it.

## 4. Verification

- [x] 4.1 Run `npm run format` and ensure no diff.
- [x] 4.2 Run `npm run typecheck` and ensure no errors.
- [x] 4.3 Run `npm run lint` and ensure no errors.
- [x] 4.4 Run `npm run test` and ensure all tests pass, including the new ones in section 3.
