## Context

`AddTaskRow` (`src/features/tasks/components/AddTaskRow.tsx`) renders a single-row form: a `+` circle, a text input, and (when 2+ groups exist) a `GroupChip` on the right. When the user types `#` anywhere in the input, the `handleInput` callback runs the regex `#(\S*)$` against the current value and, on a match, sets a local `showTypeahead` flag. The component then renders a `GroupTypeahead` sibling `<div>` directly under the input row (lines 90–100), which contains up to 5 group suggestions that start with the typed prefix (or the first 5 groups when the prefix is empty).

The `GroupTypeahead` block is a regular DOM child of the form's flex column. It is _not_ a floating layer:

- It pushes surrounding rows down as it appears and grows (every keystroke can change its height).
- It is positioned by normal flow, so on narrow widths it can overflow the viewport horizontally and cannot be flipped to the side of the input.
- It does not auto-dismiss on outside click or `Escape` — the only way to hide it is to type a non-`#` character that breaks the regex.
- It does not animate in/out the way the rest of the app's popovers do (the `Popover` primitive animates open/closed via `data-open`/`data-closed` Tailwind classes; the inline `<div>` has no such treatment).
- It has no keyboard navigation at all — there is no way to pick a suggestion without the mouse.

Meanwhile, the same component already uses the shared `Popover` primitive for the `GroupChip` on the right (lines 115–147). The primitive wraps `@base-ui/react/popover`, which is the same base that powers every other popup in the app (settings sheet, timer popovers, etc.). The typeahead is the only "popup" in the codebase that does not go through it.

The fix is a one-component swap: render the suggestion list inside a `Popover` that is fully controlled by `showTypeahead`, anchored to the input element, **non-focus-hijacking**, and driven by keyboard events on the input itself (ArrowUp/ArrowDown to highlight, Enter to accept, Escape to dismiss). No new shared UI is needed, no new dependency, no store change.

## Goals / Non-Goals

**Goals:**

- Render the `#...` group suggestion list as a real floating `Popover` anchored to the add-task input, not as an inline layout child.
- Keep the existing parsing logic intact: trailing `#(\S+)` triggers suggestions, accepting a suggestion rewrites `#<prefix>` to `#<full-name> ` in the input, `Enter` on a non-matching prefix (with the popover closed) creates the group.
- **Do not steal focus from the input.** Opening the popover, navigating within it, accepting a suggestion, or dismissing it MUST leave focus on the add-task input. The popover MUST NOT move focus to itself, its first child, or any suggestion button on open, on suggestion click, or on Escape.
- **Keyboard navigation on the input:**
  - `ArrowDown` / `ArrowUp` — move the highlight (and the visual highlight indicator) through the suggestion list, wrapping at the ends.
  - `Enter` — when a suggestion is highlighted, accept it (rewrite the input, close the popover, keep focus on the input). When no suggestion is highlighted, fall through to the existing form-submit behavior. `Enter` MUST NOT submit the form when a suggestion is highlighted.
  - `Escape` — close the popover. The input value is preserved. Focus stays on the input.
- **Closing triggers** (in priority order): `Escape` (keyboard), suggestion click, suggestion `Enter` accept, removing the trailing `#` from the input (i.e. the existing `setShowTypeahead(!!hashMatch)` logic). Outside-click also closes the popover, via base-ui's built-in dismiss-on-outside-pointerdown; this still preserves the input value and the focus.
- Tab navigation MUST NOT enter the popover; the suggestions are reachable only with the arrow keys (and by mouse). This is enforced with `tabIndex={-1}` on the suggestion buttons and on the popup wrapper.

**Non-Goals:**

- Changing the parsing regex, the `addGroup` call path, or the `handleSubmit` flow.
- Auto-completing the task (`task.completed = true`) when the user accepts a suggestion.
- Changing the `GroupChip` popover on the right (already uses the primitive correctly).
- A "no matches" disabled row as a new visual element. The existing `Press Enter to create group "<query>"` hint is preserved (the proposal still covers it).
- Mouse hover highlighting. The highlight is keyboard-driven; mouse hover MAY add a transient highlight via a CSS `:hover` rule on the suggestion rows, but this is incidental and is not part of the contract.
- A search/filter input inside the popover. The popover is a passive list, driven entirely by the input's text content.

## Decisions

### 1. Use the existing `Popover` primitive — do not add a new shared UI component

- **Choice:** Wrap the suggestion list in `Popover` / `PopoverContent` from `src/shared/ui/`. The wrapper already handles portal, positioning, animation, and ARIA wiring.
- **Rationale:** Zero new code in `shared/ui/` if the wrapper is extended to expose `anchor` (see decision 2). Every other popup in the app already goes through this primitive, so the suggestion list gets the same dismissal, animation, and accessibility behavior for free.
- **Alternatives considered:**
  - Roll a custom floating layer with `@floating-ui/react` directly — rejected: duplicates the existing wrapper, brings no new capability.
  - Use a `<dialog>` element — rejected: would force a modal-like focus trap, breaks the inline-with-form UX.

### 2. Extend `PopoverContent` to accept an `anchor` prop

- **Choice:** Add `'anchor'` to the `Pick<PopoverPrimitive.Positioner.Props, ...>` type in `src/shared/ui/popover.tsx` and forward it to the inner `PopoverPrimitive.Positioner`. `anchor` accepts an `Element | RefObject<Element> | VirtualElement`, per `@base-ui/react`'s `UseAnchorPositioningSharedParameters`.
- **Rationale:** The trigger for this popover is _not_ a clickable element — it is the input element, which already lives in the DOM and whose visibility is driven by the `value` prop. The conventional base-ui pattern of "trigger is the button that opens the popover" does not apply. Using a custom `anchor` is the documented escape hatch for "the popup's position is determined by an element that is not the trigger".
- **Alternatives considered:**
  - Wrap the input in a `<PopoverTrigger>` div — rejected: the input is the element users type into, and wrapping it in a generic div does not give base-ui a useful anchor (the wrapper would not move with the caret or with the input's content).
  - Render a hidden `<button>` next to the input as the trigger and call `setShowTypeahead(true)` on its `click` — rejected: this changes the trigger model from "the user is typing `#`" to "the user clicked somewhere", which is not the desired UX.

### 3. Anchor = the input element's ref; side = bottom, align = start, sideOffset = 4

- **Choice:** `anchor={inputRef}`, `side="bottom"`, `align="start"`, `sideOffset={4}` (which is the `PopoverContent` wrapper's default). The popover is placed directly under the input's left edge, with a 4px gap.
- **Rationale:** `align="start"` matches the input's left padding (which is where the caret starts on an empty input), keeping the suggestion list visually attached to the input's text column. `side="bottom"` matches the current visual placement. `sideOffset={4}` matches the wrapper's default so the gap is consistent with the other popovers in the app.
- **Alternatives considered:**
  - `align="center"` — rejected: would float the popover to the input's horizontal centre, which is the input's middle, not where the text starts. Misleading for a suggestion list keyed on text the user typed.
  - `side="top"` — rejected: the form is at the top of every view's task list, so the popover has nothing to anchor to above and would collide with the header.

### 4. Disable base-ui's auto-focus on open via `initialFocus={false}`

- **Choice:** Pass `initialFocus={false}` to `PopoverContent` (which forwards it to the inner `PopoverPrimitive.Popup`). Also pass `tabIndex={-1}` to the popup itself (via the `PopoverContent` `className`/prop, see decision 7) and to each suggestion `Button`.
- **Rationale:** `@base-ui/react`'s `Popover.Popup` accepts an `initialFocus` prop (`false` | `true` | `RefObject` | function). The default is `true`, which moves focus to the first tabbable child on open — that is a focus hijack. Setting it to `false` makes the popover a pure visual layer. With `tabIndex={-1}` on the suggestion buttons, Tab navigation in the input does not enter the popover; Escape and click still dismiss it via base-ui's built-in handlers.
- **Alternative considered:**
  - Use `modal="trap-focus"` and explicitly close on Escape — rejected: trap-focus would still focus the popup, which is the exact behavior the user is pushing back against.

### 5. Controlled open state synced via `onOpenChange`

- **Choice:** `<Popover open={showTypeahead} onOpenChange={(open) => { if (!open) setShowTypeahead(false); }}>`. The popover follows `showTypeahead` exactly; the only way `showTypeahead` becomes `true` is by re-entering `handleInput` on a new keystroke.
- **Rationale:** This avoids the "dismiss and instantly re-open" loop. When the user hits Escape or clicks outside, `onOpenChange(false)` flips `showTypeahead` to `false`; the popover closes; the input value still contains `#foo`; no `handleInput` fires (no input event), so `showTypeahead` stays `false`. The next keystroke re-evaluates the regex and reopens if appropriate. This matches the expected typeahead UX.
- **Alternatives considered:**
  - A separate `typeaheadDismissed` flag that resets on every keystroke — equivalent in behavior, more state to reason about, rejected.
  - Always re-derive `showTypeahead` from the input value on every render — rejected: re-renders don't re-derive state, and using a derived value would mean escape can never close the popover.

### 6. Keyboard navigation: highlight state in the input component, handled via `onKeyDown`

- **Choice:** Add a local `highlightIndex: number | null` state in `AddTaskRow`. Extend the input's `onKeyDown` to:
  - `ArrowDown` / `ArrowUp`: `e.preventDefault()`; compute the next/previous index in the matched-suggestion list (wrap at the ends); set `highlightIndex` accordingly. If the popover is closed or has no matches, the keypress is a no-op.
  - `Enter`: if the popover is open and there is a highlighted suggestion, `e.preventDefault()`, call the existing `accept(group)` path (rewrite the input, close the popover, clear `highlightIndex`, refocus the input), and return without calling `handleSubmit`. If the popover is open but no suggestion is highlighted, fall through to `handleSubmit` (the form-submit behavior is preserved). If the popover is closed, the existing `Enter → handleSubmit` behavior is preserved.
  - `Escape`: if the popover is open, `e.preventDefault()`, set `showTypeahead(false)` and `highlightIndex(null)`. Otherwise, let the keypress propagate (other Escape handlers in the app still work).
- **Rationale:** The input element is the natural focus target. The highlight state lives in the same component as the input, so wiring `onKeyDown` is one handler. `e.preventDefault()` on `Enter` stops the form from also submitting. `highlightIndex` is `null` by default — visually, "no highlight" is a non-state; the suggestion list shows the existing flat visual treatment, and the keyboard highlight is opt-in.
- **Alternatives considered:**
  - Auto-highlight the first suggestion whenever the popover opens — rejected: the user can pick with `Enter` even without a highlight (Enter falls through to submit, which is the form's job). Auto-highlighting would require the user to know "Enter picks the highlighted one" before they've seen a highlight, which is more mental model.
  - Put the keydown handler on the popup instead of the input — rejected: the popup does not own focus (decision 4), so the keydown would not fire when the user is typing in the input.

### 7. Visual highlight on the selected suggestion

- **Choice:** A suggestion row whose index equals `highlightIndex` is rendered with a different background (e.g. `bg-accent/30` or `bg-muted`) and an accent left border or text color. The non-highlighted rows use the existing flat treatment.
- **Rationale:** Without a visual highlight, the keyboard navigation is invisible to the user. The highlight is the user's only feedback that `ArrowDown` did anything. A muted background is enough — this is a typeahead, not a primary picker.
- **Alternatives considered:**
  - Underline / outline the highlighted text — rejected: the suggestion buttons are full-width rows, not inline text, so a background change reads more clearly.
  - Animate the highlight with a `transition: background-color` — rejected: it adds motion to a list that is already animating open/close; the highlight should snap, not glide.

### 8. `tabIndex={-1}` on the popup and on each suggestion `Button`

- **Choice:** Render the `PopoverContent` wrapper with `tabIndex={-1}` (so the popup element itself is not in the tab order) and render each suggestion as a `Button` with `tabIndex={-1}` (so Tab from the input skips them and goes to the next focusable element, which is the `GroupChip` on the right when 2+ groups exist, or otherwise out of the row).
- **Rationale:** The popover is keyboard-driven by the input's `onKeyDown`. Tab should not enter it. The popup wrapper itself also gets `tabIndex={-1}` so screen readers and Tab both skip it.
- **Alternative considered:**
  - `inert` attribute on the popup — rejected: `inert` would also block the popup's own onClick handlers, breaking mouse interaction with the suggestions. `tabIndex={-1}` only blocks Tab, not click.

### 9. The "no matches → Press Enter to create" hint becomes a disabled row inside the popover

- **Choice:** When the prefix has no matches, render a single non-interactive row inside the popover content with the same text the inline block used (`Press Enter to create group "<query>"`). Style it as muted, full width, with a left-aligned 8px color dot in a neutral color to match the other rows' visual rhythm.
- **Rationale:** Preserves the discoverability of the create-on-Enter path. A disabled row inside the popover still reads as a popup member, not as a stray inline message; it dismisses with the rest of the popover (Escape / outside click) and the popover's built-in animation handles it for free.
- **Alternatives considered:**
  - Drop the hint entirely — rejected: the create-on-Enter path is part of the existing UX and a regression would be silent.
  - Render the hint as a `Popover.Description` — rejected: the description is for the popover's purpose, not a single-row message; using it here would change the popover's a11y tree in a misleading way.

## Risks / Trade-offs

- **Extending `PopoverContent` to accept `anchor` is a shared-UI surface change.** A future consumer could pass a bad anchor and break positioning. → Mitigation: the type is constrained by `@base-ui/react`'s `UseAnchorPositioningSharedParameters['anchor']`; misuse surfaces as a runtime positioning warning from base-ui, not a silent bug. The added prop is additive, no existing call site changes signature.
- **Disabling auto-focus via `initialFocus={false}` also disables it for the `GroupChip` popover if a future consumer passes it through.** → Mitigation: `initialFocus` is per-call; the default for all other call sites is unchanged. Only `AddTaskRow` opts out.
- **`tabIndex={-1}` on the suggestion buttons hides them from screen reader tab navigation, but the popover itself is still discoverable by `aria-describedby` and the visual highlight.** A user navigating with a screen reader and Tab alone would not see the suggestions, only the input and the `GroupChip`. → Mitigation: the popover's `aria-live` is not enabled (it is a passive list); the typeahead is a mouse/keyboard affordance, and the existing `GroupChip` provides a parallel path. If a follow-up adds full screen-reader support, it can add `aria-activedescendant` and `role="listbox"` on the popup; this is explicitly out of scope.
- **The highlight state is local component state.** A future refactor that lifts the add-task input to a higher component would have to lift `highlightIndex` too. → Mitigation: the `AddTaskRow` is currently a leaf component rendered directly by `TaskList`; there is no sign of pending refactor. If the typeahead grows, a `useGroupTypeahead` hook is the natural extraction.
- **Suggestion list no longer affects layout.** This is the desired behavior, but it means the add-task row's vertical footprint is now constant. Visually this is an improvement; functionally no caller depends on the typeahead's height.
- **Dismiss + retype cycle is subtle.** If the user dismisses the popover (Escape), the input value still contains `#foo`. The next render does not re-open the popover, which is correct. A user who deletes one character from `#foo` will fire `handleInput` and the regex `#(\S+)$` will still match, so the popover reopens — also correct. → No mitigation needed; behavior is intentional and matches the user's mental model.

## Migration Plan

None. The change is a single-component refactor. No localStorage key changes, no schema changes, no data backfill, no API surface change. The behavior the user sees is now strictly richer: floating layer, keyboard navigation, dismissible on Escape and outside click.

## Open Questions

None. All design decisions resolved during exploration. The follow-up worth tracking is full screen-reader support for the suggestion list (`aria-activedescendant` + `role="listbox"`), which is explicitly out of scope for this change.
