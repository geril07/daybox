## Context

DayBox is a local-first Pomodoro + planner SPA. Its current `TaskRow` interaction model is mouse-first: the drag handle is `opacity-0` until `onMouseEnter` fires, and the Focus/Delete action icons live in a `group/actions` div with `opacity-0` that fades in on hover. On a coarse pointer (touch) these states never trigger, leaving the most-used Pomodoro action and the only destructive action unreachable.

The codebase already has the right primitives to fix this cleanly:

- Tailwind v4 ships `pointer-coarse:` / `pointer-fine:` variants that compile to `@media (pointer: coarse)` and `@media (pointer: fine)`. They can be combined with `group-hover:` and used anywhere `hover:` is used today.
- `@dnd-kit/react` 0.4 exposes `PointerActivationConstraints.Delay(value: number, tolerance: number)` as a constructor the `activationConstraints` option can return per-source.
- The existing `Sheet` (base-ui dialog) supports `side="bottom"` and the `task-management` spec already requires destructive action affordances to live on the row.

There is no separate mobile shell planned; the constraint is **one component tree, two pointer behaviors**, branched at the CSS and sensor levels.

## Goals / Non-Goals

**Goals:**

- Make the drag handle, Focus, and Delete reachable on coarse pointers without a separate mobile code path.
- Preserve the existing desktop experience exactly: hover-reveal of the drag handle and the action icons stays intact on `pointer:fine`.
- Fix scroll-vs-drag conflicts on touch by adding a press delay to the drag activation only on touch.
- Apply the smallest layout change required to keep the four-view tab list and the single `max-w-[680px]` column legible on phones.

**Non-Goals:**

- No touch-target size bumps; the row's `46px` min-height and `gap-2.5` padding already give the inner icons an effective tap area larger than the visible glyphs.
- No `aria-label` / accessibility refactor. The user has confirmed screen readers are not a priority for this change; existing `title=` attributes continue to provide the accessible name as a fallback.
- No changes to the `TimerBar` content, controls, or hover tooltips. Its narrow-screen squeeze was explicitly out of scope.
- No swipe gestures, no long-press-to-grab without a visible handle, no per-device action rewrites beyond the kebab.
- No rename of `Unscheduled`; only the `This Week` tab label compresses below `sm:`.

## Decisions

### D1. Branch by CSS media query, not JS

`pointer:coarse` is evaluated by the browser at render time and re-evaluated on pointer-type change (rare). Branching in CSS via `pointer-coarse:opacity-100` keeps TaskRow markup declarative, costs nothing at runtime, and matches the rest of the codebase's Tailwind-only styling.

Alternatives considered: a `useMediaQuery('(pointer: coarse)')` hook with React state. Rejected — adds a render, a state subscription, and an extra file for no behavioural gain.

### D2. Drop the `hovering` React state from TaskRow

The current code maintains `const [hovering, setHovering] = useState(false)` and toggles it via `onMouseEnter` / `onMouseLeave` to drive the drag handle's `opacity-100`. This is the only reason the React state exists. With D1 the opacity is fully expressed in CSS, and the state is dead. Removing it shrinks the component and the test surface.

### D3. Reuse the existing `Sheet` for the kebab

The kebab opens a bottom-side `Sheet` (already supported at `shared/ui/sheet.tsx:54`). The sheet content is a `<SheetHeader>` with the task title and two action rows: a Focus button and a Delete button. Both call the same store actions the row's hover icons already call. The sheet is `aria-label`-d by the task title and uses the base-ui focus trap and Escape-to-close from the existing primitive.

Alternatives considered: a `Menu` (which is keyboard-first, opens upward, and would collide with the iOS bottom safe area). Rejected — bottom sheet is the natural iOS/Android shape.

### D4. Per-sortable sensor fn, not global `DragDropProvider` sensors

`useSortable` accepts a `sensors` option that can return a per-source `activationConstraints` function. We pass a function that inspects the source event's `pointerType`:

```ts
sensors: [
  PointerSensor.configure({
    activationConstraints: (event, _source) => {
      if ((event as PointerEvent).pointerType === 'touch') {
        return [PointerActivationConstraints.Delay(250, 5)]
      }
      return undefined // default (no delay)
    },
  }),
]
```

`Delay(250, 5)` means: arm after 250 ms of continuous press, abort if the pointer moves more than 5 px. This matches the mobile-dnd convention and prevents taps, scrolls, and text-selection from triggering drags.

Alternatives considered: configuring `Delay` globally on `DragDropProvider`. Rejected — the global option would also delay mouse drags, which is undesirable. The per-source function keeps mouse at drag-on-press.

### D5. 250 ms delay, not 500 ms

500 ms is the platform-standard long-press threshold for context menus (iOS, Android, Material 3). 250 ms is the convention for mobile drag handles in dnd-kit examples and most drag-list UIs (Trello, Things mobile). 500 ms makes the drag feel sluggish on a list that is otherwise a one-tap interaction; 250 ms prevents accidental grabs on a tap without slowing intentional ones.

### D6. Compression trigger is `sm:`, not `pointer:coarse`

`pointer:coarse` is also true on iPads in landscape (1024 px wide, fine room for "Unscheduled"). Width-based (`sm:` = 640 px) keeps iPads at full labels and only compresses phones. The four `flex-1` `TabsTrigger` cells share the available width; below `sm:`, "This Week" overflows its cell, the other three fit, and the "Week" label keeps the cell's intrinsic width under control.

Alternatives considered: `pointer:coarse` only. Rejected — compresses iPad labels for no benefit. Always-compressed. Rejected — the user chose "as-is" for Unscheduled, and the desktop density is part of the brand.

### D7. `px-4 sm:px-7` for the column gutter

`px-7` (28 px) is 7.8% of a 360 px screen, which leaves only 304 px for the four flex-1 tabs. `px-4` (16 px) leaves 328 px — 24 px more for the row's content and the four tabs. Above `sm:` we keep `px-7` because the column is no longer width-constrained. 16 px is the iOS HIG minimum gutter and matches Material's standard.

The change is applied at three sites: `.header-top` (App.tsx:81), `.header-nav` (App.tsx:112), and the `TimerBar` inner column (TimerBar.tsx:206).

### D8. Per-tab `shortLabel` field, not a separate compressed array

`App.tsx:56-61` has a `tabs` array of `{ label, value }`. We extend it to `{ label, shortLabel?, value }` and render `tab.shortLabel ?? tab.label` inside the `TabsTrigger`, controlled by a `className="sm:hidden"` / `sm:inline` swap on two `<span>` children. Only the `This Week` entry needs `shortLabel: 'Week'`; the others fall through to the existing `label`.

This keeps the data colocated and avoids a parallel array or a translation key for one entry.

## Risks / Trade-offs

- **Touch users still can't get to the Pomo and Date pickers from the kebab** — those continue to live on the row as visible popover icons. The bottom sheet is **not** a full action menu; it only consolidates the actions that were unreachable (Focus, Delete). → Mitigated by the user's "preserve full functionality" constraint: the existing popover icons are already touch-friendly, so this is by design, not a gap.
- **Long-press tooltips (iOS / Android long-press a button → native `title` tooltip)** — the new kebab has `title="More actions"`. Long-pressing it for ~500 ms may show the OS tooltip after the tap completes, which is mildly confusing. → Acceptable; the kebab is a discoverability nudge, not a primary action.
- **Test environment may not report `pointerType` correctly** — jsdom synthetic events lack a `pointerType` field by default. Tests that assert the touch branch of the sensor fn must construct a fake `PointerEvent` with `pointerType: 'touch'`. → Test setup will create a small helper that returns a `PointerEvent`-like object.
- **Tailwind v4 `pointer-coarse:` variant** — verified available in Tailwind v4 core, compiles to `@media (pointer: coarse)`. If the user's installed version is missing the variant (extremely unlikely on 4.x), the fallback is `@media (pointer: coarse) { .task-row-drag-handle { opacity: 1 !important } }` in `src/index.css`. Will be covered by a smoke test that renders with a stubbed `matchMedia('(pointer: coarse)')` matching `true`.
- **The drag handle is now always visible on touch, so the row's left-edge whitespace becomes intentional** — a visible `⋮` on every row costs more visual real estate than the previous invisible one. → Worth it for discoverability; matches Things / Todoist mobile.
- **The 250 ms delay may feel slow for a power user who already knows the gesture exists** — this is the standard tradeoff for mobile dnd. The handle stays close to the row edge so it is findable by muscle memory.

## Migration Plan

No data migration. No store changes. No schema changes. The change is purely:

- One new component (`TaskActionSheet.tsx`, ~50 lines)
- CSS class swaps in 4 files
- A per-sortable `sensors` config in `TaskList.tsx`
- A `shortLabel` field on the `tabs` array in `App.tsx`

Rollback is `git revert` of the change. No compatibility shims required.

## Open Questions

- None blocking. All decisions in this document were resolved during the explore phase.
