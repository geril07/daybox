## Why

In `AddTaskRow.tsx`, the `#...` group-suggestion list (the `GroupTypeahead` block rendered at lines 90–100 and 150–192) is not a real popover — it is an absolutely-styled sibling `<div>` inside the form's flex column. It opens below the input but its geometry is owned by the input row's layout, not by a floating layer. As a result it pushes the page down as the user types, fails to anchor to the input on small widths, and ignores the existing `Popover` primitive (which is already used by the same row's group chip). Replacing the inline block with the shared `Popover` primitive gets us a real floating layer with built-in positioning, dismissal, focus, and animation, and removes a class of layout bugs for free.

## What Changes

- **Replace the inline `GroupTypeahead` `<div>` with the existing `Popover` primitive from `src/shared/ui/`** (which wraps `@base-ui/react/popover`). The trigger is the `#`-matching text being typed in the input; the content is the suggestion list.
- **Anchor the popover to the input element** (`side="bottom"`, `align="start"`, `sideOffset={4}`), so the suggestion list appears as a real floating layer directly under the caret, not as a layout child of the form.
- **Drive open/closed state from the existing `showTypeahead` boolean** (which already toggles when the trailing `#...` regex matches). No new state is introduced.
- **Close the popover on item click and on Enter that creates a new group**, then return focus to the input — the same UX the current inline block attempts, but now backed by the primitive's built-in dismissal and focus handling.
- **Preserve the "Press Enter to create group `<query>`" hint** when the query has no matches; the hint becomes a single disabled row inside the popover content.
- **Keep the inline `#` parsing unchanged** (regex, `addGroup`, sticky `groupId` selection in `handleSubmit`). The change is purely a layout/primitive swap.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `task-management`: rewrite the "Create task with #group syntax" requirement to cover the popover-anchored suggestion list (anchored to the input, floating layer, dismissed on selection) and to spell out the "no matches → Enter to create" hint as a disabled row inside the popover rather than an inline div.

## Impact

- `src/features/tasks/components/AddTaskRow.tsx` — replace the `GroupTypeahead` inline `<div>` with a `Popover`/`PopoverTrigger`/`PopoverContent` block anchored to the input. Reuse the existing matched-group filtering and the existing `onSelect` callback that rewrites `#<name> ` into the input value.
- `src/features/tasks/components/AddTaskRow.test.tsx` — **new file** (no tests exist for this component today). Cover: popover does not render when the input has no trailing `#`; popover renders when the input contains a trailing `#`; clicking a suggestion rewrites the title and closes the popover; the "Press Enter to create" hint appears when no group matches and is non-interactive.
- `src/shared/ui/popover.tsx` — **no change**. The existing wrapper already supports `align`/`alignOffset`/`side`/`sideOffset` and portals its content out of the form.
- `@base-ui/react/popover` — **no change**. Already a dependency; the wrapper is the only consumer-facing entry point.
- No new dependencies. No new shared UI. No store changes. No schema changes. No data migration.
- Out of scope: keyboard navigation (ArrowUp/Down, Enter) inside the suggestion list — the current inline block has none and the change does not add it. If the user wants that, it is a follow-up.
- Out of scope: the `GroupChip` (the chip on the right of the input) — it already uses the `Popover` primitive correctly and is not affected.
