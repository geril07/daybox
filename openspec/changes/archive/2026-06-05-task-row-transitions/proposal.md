## Why

Task rows in the task list currently appear, disappear, and reorder with zero transition. Add a task, delete a task, change a task's date, or mark it complete — the DOM just snaps. The rest of the app already has motion language (`transition-background duration-120`, `duration-140`, `duration-300` on the timer, the base-ui `data-open:animate-in` / `data-closed:animate-out` pattern on Popover/Sheet/Select/AlertDialog), so the list is the loudest place that has _no_ motion at all. Adding enter/exit/move animations brings the task list in line with the rest of the app and makes state changes legible — especially the date-change case, where a task silently disappears from one section and reappears in another and the user has to scan to find it.

The "move" half is the new piece. Today, `@dnd-kit/react` + `arrayMove` causes an instant DOM swap on drop, and any state-driven reorder (e.g., the row's `sortOrder` changing) likewise just jumps. Layout/FLIP animation fixes this for free.

## What Changes

- Add `motion` (motion.dev) as a runtime dependency. Import React bindings from `motion/react`.
- New `src/shared/motion.ts` exporting four named `Transition` presets (`TRANSITION_ENTER`, `TRANSITION_EXIT`, `TRANSITION_MOVE`, `TRANSITION_TOGGLE`) plus the two cubic-bezier arrays (`EASE_OUT`, `EASE_IN`). Reusable by other features later.
- `TaskList` (`src/features/tasks/components/TaskList.tsx`) wraps its map of `DroppableTaskRow`s in `<AnimatePresence mode="popLayout" initial={false}>`. `popLayout` removes exiting items from layout flow immediately so siblings can flow into place (the "auto-shuffle" feel); `initial={false}` skips the enter animation on the first render so a rehydrated list with 30 existing tasks doesn't all fade-in on app load.
- `DroppableTaskRow` outer `<div>` becomes a `motion.div` with `layout="position"`, `layoutId={task.id}`, and `initial` / `animate` / `exit` / `transition` props sourced from the shared module. dnd-kit's `useDraggable` / `useDroppable` refs continue to work (motion forwards refs).
- `TaskRow`'s `task.completed && 'opacity-[0.52]'` className is removed; the opacity tween moves onto the parent `motion.div`'s `animate` target so the existing toggle-complete interaction gets a smooth 140ms opacity tween.
- `App.tsx` wraps the `<div className="task-list-area ...">` in `<MotionConfig reducedMotion="user">`. Under `prefers-reduced-motion: reduce`, transform and layout animations are disabled by motion itself; opacity still animates. Net effect: tasks fade in/out without sliding; reorder is instant. No per-row guard needed.
- `src/app/App.tsx` is otherwise untouched. View switch (Today → Tomorrow, etc.) does not animate — the per-view lists just unmount/remount, exactly as today. Within a stable view, all add/remove/reorder/cross-section moves animate.

## Capabilities

### New Capabilities

<!-- No new top-level capability. This change extends the existing `task-management` capability with one new requirement (see delta spec). -->

### Modified Capabilities

- `task-management`: Adds one requirement covering enter/exit/move animations on task rows. No existing requirements removed or modified.

## Impact

- **Runtime deps**: adds `motion` (~30–50 kB gzipped, tree-shaken; the React adapter entry is what we use). Single bundle, no code-splitting impact.
- **Source**: 1 new file (`src/shared/motion.ts`), 3 modified files (`TaskList.tsx`, `TaskRow.tsx`, `App.tsx`).
- **Public API**: none. The `TaskList` / `TaskRow` / `DroppableTaskRow` component signatures are unchanged.
- **Accessibility**: `MotionConfig reducedMotion="user"` is the only accessibility gate. No ARIA changes, no focus management changes.
- **Performance**: 1Hz timer tick already does not re-render the list; the list re-renders on store updates as before. Motion's layout measurement is per-row, batched, and runs in a single rAF.
- **Existing tests**: `TaskRow.test.tsx` and `store.test.ts` should keep passing unchanged — no behaviour is removed, only motion is added on top.
- **DND behavior**: unchanged. dnd-kit wrapping, `useDraggable` / `useDroppable`, `arrayMove`, `reorderTasks` are all untouched. The _visual result_ of a drop is now animated (the row glides to its new position) — this is a consequence of the shared `layout` system and matches the auto-shuffle feel. The drag itself still has no visual feedback (no lift / scale / shadow) — that remains a follow-up.
