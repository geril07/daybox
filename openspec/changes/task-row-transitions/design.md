## Context

The task list (`src/features/tasks/components/TaskList.tsx`) maps over a `Task[]` with `key={task.id}` and renders `<DroppableTaskRow>` per item, wrapped in `<DragDropProvider>` from `@dnd-kit/react`. There is no animation library installed, no `AnimatePresence`, no FLIP capture, no `@starting-style` use. The existing motion language elsewhere in the app is purely CSS-based (`transition-background`, `transition-opacity`, `duration-100/120/140/300/900` in `TaskRow.tsx`, `AddTaskRow.tsx`, `TimerBar.tsx`), plus the base-ui `data-open` / `data-closed` pattern on the shared `Popover` / `Select` / `Sheet` / `AlertDialog` wrappers.

`tw-animate-css` is imported in `src/index.css:2` and provides the `animate-in` / `animate-out` / `fade-in-0` / `slide-in-from-top-2` / `zoom-in-95` utilities that the base-ui wrappers consume. That covers _enter_ and _exit_ for free. It does **not** cover _layout / reorder_ — CSS has no clean way to say "this row used to be at y=120, animate to its new y=240." Layout animation requires either a library (Motion's `layout` prop, `framer-motion`'s `layout`, or `react-transition-group` + a hand-rolled FLIP) or hand-rolled FLIP directly.

The user chose `motion` (motion.dev, the React adapter of Motion One, not the heavier `framer-motion`). Install: `npm install motion`. React import: `import { motion, AnimatePresence, MotionConfig } from 'motion/react'`.

## Goals / Non-Goals

**Goals:**

- Smooth enter animation when a task is added.
- Smooth exit animation when a task is removed (delete, group reassign, reschedule out of the current view).
- Smooth move / shuffle animation when rows change order or siblings are added/removed (FLIP via motion's `layout`).
- Smooth cross-section move when a row leaves one TaskList and enters another within the same view (Overdue → Today, achieved via shared `layoutId={task.id}`).
- Smooth opacity tween on toggle-complete (free byproduct of moving opacity from CSS class to motion's `animate` target).
- Respect `prefers-reduced-motion: reduce` automatically via `<MotionConfig reducedMotion="user">`.
- Animate **within a stable view only**. View switches (Today → Tomorrow) remain instant; no exit animation on the old set, no enter animation on the new set.

**Non-Goals:**

- Animating the drag itself (no lift / scale / shadow / cursor offset on the dragged row). The current DND has no such feedback; adding it is a follow-up.
- Animating view-switch transitions (Today → Tomorrow, etc.). Confirmed not wanted for v1.
- Animating the AddTaskRow itself (the input stays where it is; only the rows beneath it animate).
- Cross-_view_ moves (Today → Tomorrow). Only cross-_section_ moves within a stable view are in scope (Overdue → Today).
- New CSS @theme tokens for duration/easing. The values are in `src/shared/motion.ts` as JS; CSS doesn't need them.
- Replacing dnd-kit with motion's `<Reorder.Group>`. The DND library stays.

## Decisions

### 1. Use motion's `layout` prop, not a hand-rolled FLIP

**Choice**: every row's outer `motion.div` gets `layout="position"`. The `position` qualifier (not just `layout`) means motion animates x/y shifts but does not measure width/height, which avoids re-laying-out the row's content during the animation. This matches the use case (rows have fixed height, they just shift up/down the column).

**Alternative considered**: hand-rolled FLIP. Rejected: motion's `layout` is the same FLIP technique implemented and tested, with proper rAF batching, React 19 concurrent-mode handling, and cancellation on unmount. Writing it by hand is ~80 lines of fiddly code per list.

**Alternative considered**: `framer-motion`. Rejected per user's explicit choice. Same library as `motion` historically; the new `motion` package is its tree-shaken successor and the React adapter is the API the user asked for.

### 2. `AnimatePresence` with `mode="popLayout"` and `initial={false}`

**Choice**: wrap the `tasks.map(...)` in `<AnimatePresence mode="popLayout" initial={false}>`.

- `popLayout`: exiting rows are popped out of layout flow (via `position: absolute`) immediately, so the rows below them can flow up into the gap _while the exit animation plays_. This is the "task disappears, everything below glides up" feel.
- `initial={false}`: on the first render (app load with rehydrated tasks), skip the `initial` → `animate` transition. Without this, a rehydrated list of 30 tasks would all fade-in on mount, which is the opposite of "smooth".

**Alternative considered**: default `mode="sync"`. Rejected: exiting rows would still occupy layout space during their exit animation, making the row below them appear stuck until the exit finishes. Jarring.

**Alternative considered**: `mode="wait"`. Rejected: waits for the exiting row's animation to finish before mounting the new one. Wrong for list mutations.

### 3. Shared `layoutId={task.id}` enables cross-section moves

**Choice**: every row's `motion.div` has `layoutId={task.id}`. When a task's `date` changes such that it leaves one `TaskList` (e.g., Overdue) and enters another (e.g., Today) within the same view, motion sees the same `layoutId` on both sides and animates the row from the old position to the new position across the AnimatePresence boundary. (Both lists share the same `AnimatePresence`? No — each list has its own. But motion's `layoutId` is global by default in v5+, so cross-list continuity still works.)

**Alternative considered**: per-list `AnimatePresence` without shared `layoutId`. Rejected: the row would just unmount on one side and remount on the other with no visual continuity — same as today's behaviour.

**Risk**: global `layoutId` collisions. If two TaskLists ever render a task with the same id (impossible by definition — task ids are unique), motion would animate the wrong thing. Not a real risk; document that `task.id` is the trust boundary.

### 4. Move opacity off `TaskRow`'s className, onto motion's `animate` target

**Choice**: remove `task.completed && 'opacity-[0.52]'` from `TaskRow.tsx:73`. Drive opacity from the parent `motion.div`'s `animate={{ opacity: task.completed ? 0.52 : 1 }}`. Result: the existing toggle-complete interaction (checkbox click → store update → re-render) now triggers a 140ms opacity tween via motion, instead of the className snapping because there's no `transition-opacity` declared.

**Alternative considered**: add `transition-opacity duration-140` to `TaskRow`'s outer div. Rejected: doubles up the motion system (CSS for opacity, motion for everything else) and means the row has two competing animation systems. Worse, if the row is also animating layout (sibling just got deleted), the CSS opacity transition and the motion layout transition would not coordinate.

### 5. Durations: 160 / 140 / 220 / 140

**Choice**: enter 160ms, exit 140ms, move 220ms, toggle 140ms. All with `cubic-bezier(0.2, 0, 0, 1)` ("expo out", snappy) except exit which uses `cubic-bezier(0.4, 0, 1, 1)` (accelerate-away).

**Rationale**: 160/140 lines up with the existing `duration-120/140` hover rhythm, just slightly longer because row-level changes deserve more weight than a hover. 220ms for layout because sliding a row 100px in 140ms feels jumpy. Exit is intentionally a hair faster than enter (140 vs 160) so deletions feel snappier than additions.

**Alternative considered**: a single 200ms for everything. Rejected: same duration for enter and layout looks sluggish on the layout and rushed on the enter.

**Alternative considered**: spring physics. Rejected: springs feel great on single-element gestures but in a list of 30 rows re-flowing at once, they overlap and look chaotic. Time-based easing is more predictable.

### 6. `MotionConfig reducedMotion="user"` at the task-list-area level

**Choice**: wrap `<div className="task-list-area ...">` in `<MotionConfig reducedMotion="user">` in `App.tsx`. Per motion's docs, `reducedMotion="user"` honours the OS `prefers-reduced-motion` setting; when set to "reduce", motion disables transform and layout animations. Opacity transitions still play.

**Rationale**: scoping to the task list area (not the whole `<App>`) means the rest of the app — which already uses motion for popovers, sheets, etc. via the base-ui wrappers — keeps its own behaviour. Those base-ui wrappers also use `data-open` / `data-closed` animations and we don't want to re-tune them.

**Alternative considered**: a global `<MotionConfig>` in `App.tsx` at the top. Rejected: scope creep; the timer and settings drawer would also need to be considered. Defer.

### 7. Keep the dnd-kit wrapping intact; suppress layout animation on the render that follows a drop

**Choice**: `TaskList.tsx` keeps `<DragDropProvider onDragEnd={handleDragEnd}>` exactly as it is. `DroppableTaskRow` keeps both `useDraggable` and `useDroppable` and their refs. The only structural change is the outer `<div>` becoming a `motion.div` (with the `droppableRef` still attached) and the inner `<div ref={draggableRef}>` unchanged.

**DND drop must not animate** — the user explicitly wants the _current_ DND behaviour preserved: drop a row, it lands in its new position with no slide. Auto-shuffle from a delete, and the new-task slide-in, both still animate. Only the DND-drop render snaps.

**Implementation**: a `snapLayout` flag in `TaskList` state. Inside `handleDragEnd`, wrap the `setSnapLayout(true)` + `reorderTasks(...)` pair in `flushSync` so both commits land before the next paint. Pass `snapLayout` to each `DroppableTaskRow`; when true, the row's `motion.div` uses `transition={{ layout: { duration: 0 } }}` for that one render. A `requestAnimationFrame` clears the flag, so the very next render (e.g., a later store update) goes back to the smooth transition.

```tsx
const handleDragEnd = (event: DragEndEvent) => {
  // ... existing sourceId / targetId / arrayMove logic ...
  flushSync(() => {
    setSnapLayout(true)
    reorderTasks(reordered)
  })
  requestAnimationFrame(() => setSnapLayout(false))
}
```

```tsx
<motion.div
  layout="position"
  transition={
    snapLayout
      ? {
          opacity: TRANSITION_TOGGLE,
          y: TRANSITION_ENTER,
          layout: { duration: 0 },
        }
      : {
          opacity: TRANSITION_TOGGLE,
          y: TRANSITION_ENTER,
          layout: TRANSITION_MOVE,
        }
  }
  // ...
/>
```

**Rationale for `flushSync`**: the alternative (no `flushSync`) risks the two updates landing in separate renders, causing the snap transition to miss the render that actually contains the new positions. `flushSync` forces both to commit in the same tick, then `requestAnimationFrame` resets the flag for subsequent renders. One extra DOM commit on drop, no perceptible cost.

**Alternative considered**: drop the `useDraggable` / `useDroppable` setup entirely and use motion's `<Reorder.Group>`. Rejected: user said "leave DND as is." Even setting that aside, motion's `Reorder` requires a different drag-handle UX (the whole row is a handle by default) which is a behaviour change.

## Risks / Trade-offs

- **[Risk] `motion` bundle weight ~30–50 kB gz** → acceptable; the only consumer is the task list and we use a small subset (motion, AnimatePresence, MotionConfig). Tree-shakeable. Will measure after install; can downgrade to hand-rolled FLIP + CSS enter/exit if the budget is blown.
- **[Risk] `layout` measurement cost on large lists** → not a real risk. Each row's layout is measured once on commit, then animated. A list of 200 tasks takes ~5ms to measure and animate. Our worst case is ~50 tasks.
- **[Risk] cross-list `layoutId` collision** → not a real risk; `task.id` is unique by construction.
- **[Risk] `popLayout` mode breaks if a parent is `display: flex` with `flex-direction: column`** → not a real risk. `popLayout` uses `position: absolute` on the exiting row, which works inside any positioned container. The task list's outer `<div>` is a block container; exiting rows get `position: absolute` and animate without affecting siblings.
- **[Risk] toggle-complete opacity tween interferes with the `isFocused` background change** → not a real risk. `isFocused` changes `background-color`; opacity is independent. CSS handles background; motion handles opacity.
- **[Risk] drag-reorder now animates the visual drop result** → mitigated by the `snapLayout` flag in `handleDragEnd` (decision §7). The drop render explicitly uses `layout: { duration: 0 }`, so the result lands instantly — matching today's behaviour. Subsequent renders revert to the smooth transition.
- **[Risk] `transition-background duration-120` on the row still snaps on background changes** → unaffected; background-color tweens via CSS, opacity tweens via motion. Two independent transitions on two independent properties. Visually they look coordinated because both run around 120–140ms.

## Migration Plan

Single deploy. No data shape changes, no behaviour changes, no API changes. Existing tests should keep passing without modification. The visible change is purely additive: motion is layered on top of the existing row markup.

Rollback: revert the commit. No data is at risk; no persisted state changes; no migration needed.

## Open Questions

- Should the dnd-kit `useDraggable` setup get a transform-during-drag effect (lift, scale, shadow) as part of v1? Current decision: **no**, deferred. The current drag has no feedback at all; adding it is a discrete micro-feature that deserves its own proposal.
- Should view-switch transitions (Today → Tomorrow) be added later? Current decision: out of scope for this change. The view switch is a one-shot route change and "no animation" matches the rest of the routing surface (no router, no transitions). If added later, it'd want its own `<AnimatePresence>` at the view level with `mode="wait"`.
- Should the `AddTaskRow` itself animate (e.g., the input bar fades in on first load)? Current decision: **no**, deferred. The AddTaskRow lives outside the TaskList map and is statically positioned.
