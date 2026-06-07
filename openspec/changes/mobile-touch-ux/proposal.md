## Why

DayBox is functionally a touch-only app for many users — but its task interaction model is hover-gated. On a touch device the `TaskRow` drag handle is invisible, and the **Focus** and **Delete** actions are inside a container that is `opacity-0` until the user hovers. The hover never fires on touch, so the headline Pomodoro action (focus a task) and the safety action (delete) are both unreachable. There is no mobile-only code path; the whole app assumes `pointer:fine`.

This change keeps desktop behavior identical and adds a single touch branch: make drag and the missing actions reachable on coarse pointers using the same components, no separate mobile surface.

## What Changes

- **`TaskRow` reveals a drag handle on touch** — the `⋮` glyph is currently `opacity-0` until mouse-enter; on `pointer:coarse` it is permanently visible (Tailwind `pointer-coarse:opacity-100`). Desktop hover-reveal is unchanged.
- **Drag activation gains a touch-only press delay** — `@dnd-kit/react`'s `useSortable` receives a per-instance sensor configuration that returns `PointerActivationConstraints.Delay(250, 5)` when `event.pointerType === 'touch'` and the default for mouse. Touch users long-press the handle to grab; mouse users keep drag-on-grab. This prevents scroll-vs-drag conflicts.
- **A kebab button (`⋯`) replaces the hover-revealed action icons on touch only** — when `pointer:coarse`, the `group/actions` div with `Focus` and `Delete` is replaced by a single `⋯` button that opens an existing `Sheet` (side=`bottom`) containing a header with the task title and two rows: `Focus this task` and `Delete`. Desktop hover-reveal of the two icons is unchanged.
- **Container gutter drops on narrow screens** — `px-7` becomes `px-4 sm:px-7` in the three places that share the `max-w-[680px]` column (header top, header nav, main content, `TimerBar` inner). No structural change; the column already shrinks.
- **The "This Week" view-tab label compresses below `sm:`** to "Week"; the other three labels (`Today`, `Tomorrow`, `Unscheduled`) fit at full size. Tabs remain the same list with the same `view` enum values.
- **No new primitives.** The bottom sheet reuses the existing `Sheet` (already supports `side="bottom"`). No new shared/ui component.

Desktop users see no visual or behavioral change. Touch users get: a visible drag handle, a way to focus, a way to delete, and a bit of breathing room on phones.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `task-management`: `TaskRow` exposes Focus and Delete to coarse-pointer (touch) users via a kebab → bottom-sheet pattern; the drag handle is always visible on coarse-pointer devices; the drag sensor uses a touch-only press delay.
- `time-views`: the planner view tabs compress the "This Week" label to "Week" on viewports narrower than the `sm` breakpoint (640 px).

## Impact

- `src/features/tasks/components/TaskRow.tsx` — drop the `hovering` React state and `onMouseEnter/Leave` handlers on the drag-handle div; switch to `group-hover:opacity-100` on a `.group` parent combined with `pointer-coarse:opacity-100`; add the new `<TaskActionSheet>` `⋯` button (visible only on `pointer:coarse`).
- `src/features/tasks/components/TaskActionSheet.tsx` — new file, ~50 lines, wraps the existing `Sheet` with a bottom-side popup containing a header (task title) and a list of actions (Focus, Delete). `Delete` uses the same `deleteTask` store call; `Focus` calls the same `focusTask` store call.
- `src/features/tasks/components/TaskList.tsx` — pass a per-sortable `sensors` config to `useSortable` whose `activationConstraints` is a function returning `[PointerActivationConstraints.Delay(250, 5)]` when the source event's `pointerType === 'touch'`, else `undefined` (default behavior).
- `src/app/App.tsx` — `px-7` → `px-4 sm:px-7` on `.header-top` and `.header-nav`; the `tabs` array gains `shortLabel` and the `TabsTrigger` renders `tab.shortLabel ?? tab.label` below `sm:`. Update the `Today/Tomorrow/This Week/Unscheduled` entry to `{ label: 'This Week', shortLabel: 'Week', value: 'week' }`.
- `src/features/timer/components/TimerBar.tsx` — `px-7` → `px-4 sm:px-7` on the inner column wrapper. No content changes.
- Tests — `TaskRow.test.tsx` gains coverage for: (1) the drag handle is visible when `matchMedia('(pointer: coarse)')` matches; (2) the kebab button is rendered and opens a sheet on touch; (3) clicking `Focus` and `Delete` in the sheet triggers the corresponding store actions. `TaskList.test.tsx` (or a new unit) covers the touch-only Delay sensor branch using a mocked `PointerEvent` with `pointerType: 'touch'`.

No schema, store, or persistence changes. No new dependencies. `add-timer-focus-mode` and `add-date-browser-entry-point` remain compatible (they don't touch `TaskRow`, the drag handle, the new sheet, or the tab label).

## Out of scope

- Touch-target size bumps (the row's `46px` min-height + `gap-2.5` padding gives the inner icons an effective tap-area larger than their visible size).
- Replacing `title=` tooltips with `aria-label` (the user has confirmed screen-reader and accessibility concerns are not a priority for this change).
- A "compress all tab labels" pass — only "This Week" needs it to fit four tabs at `sm:` width.
- Changes to the `TimerBar` layout, controls, or hover tooltips (it is the protagonist on mobile but its narrow-screen squeeze was explicitly out of scope).
- Swipe-to-action gestures, long-press-to-grab without a visible handle, or any touch-specific reorder UX beyond the press delay.
- A separate `mobile mode` / different shell — the app continues to render the same component tree on both pointer types.
