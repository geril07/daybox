## Why

The animation system added in `2026-06-05-task-row-transitions` has two related defects that share a single fix. First, the spec scenario "Rescheduling a task to a different section animates the cross-section move" is **not satisfied by the current code**: the two `TaskList` instances inside `DayView` (and the seven-plus inside `WeekView`) live in separate `<AnimatePresence>` boundaries with no `<LayoutGroup>` ancestor, so a reschedule produces two independent fades (one exit in the source section, one enter in the destination) instead of one continuous FLIP flight. Second, the "drag snap" behaviour on reorder is implemented with a `flushSync` + `setSnapLayout(true)` + `requestAnimationFrame(() => setSnapLayout(false))` triple in `TaskList.tsx:38-42` that coordinates React state with a zustand store update; the `requestAnimationFrame` is racy (a sibling re-render can land in the wrong frame) and the pattern has to be drilled into every sortable row.

`motion` ships `<LayoutGroup>`, the primitive that solves both. Wrapping each view's sections in one `<LayoutGroup>` lets the shared `layoutId={task.id}` bridge the source and destination `AnimatePresence` for a true FLIP, and its `transition` prop is the natural home for the snap-once transition — replacing the per-row `transition.layout` override and the rAF reset with a single declarative prop on the parent.

## Prerequisites

The change `scope-task-reorder-by-date` (now in archive as `2026-06-07-scope-task-reorder-by-date`) restructured `TaskList` to add a tristate `date` prop and an isolated per-bucket `useSortable` group. It explicitly preserved the pre-change snap pattern in its design decisions. This change operates on the post-`scope-task-reorder-by-date` `TaskList` shape and assumes that change is in the archive. If the archive is rolled back and this change is re-applied, the typecheck step will fail with a `reorderTasks` signature mismatch.

## What Changes

- **Add `<LayoutGroup>` to each view** with a view-scoped `id`:
  - `DayView` — one `<LayoutGroup id="planner-day">` spans the Overdue section (if any) and the main section.
  - `WeekView` — one `<LayoutGroup id="planner-week">` spans the Overdue section (if any) and all per-day sections.
  - `DateBrowser` — one `<LayoutGroup id="planner-date">` wraps the stepper and the single task list. (One section today, but the wrapper keeps the API uniform and future-proofs for splitting browse into past/future groups.)
  - Per-view scopes prevent `layoutId` collision across views (relevant only if two views are ever mounted side by side) and prevent cross-view FLIP attempts when the user switches tabs.
  - Note: `<LayoutGroup>` in motion@12 accepts only `id` and `inherit`. The cross-section FLIP is enabled by the `id` alone (which scopes layout measurement to the view's subtree); no `transition` prop is set on the LayoutGroup.
- **Encapsulate the snap pattern in a small `useLayoutSnap` hook** in `src/shared/utils/motion.ts`, returning `{ snapLayout, snap }`. The hook owns the `flushSync` + `requestAnimationFrame` reset and replaces the previous inlined plumbing in `TaskList.tsx`.
- **Use the hook inside `<TaskList>`.** `TaskList` calls `useLayoutSnap()` and uses `snap` in `handleDragEnd` (replacing the local `flushSync` + `setSnapLayout(true)` + rAF triple). It passes `snapLayout` to each `SortableTaskRow` / `StaticTaskRow` for use in the row's `motion.div` `transition.layout` (`snapLayout ? { duration: 0 } : TRANSITION_MOVE`). The view is unaware of the snap.
- **Replace the `requestAnimationFrame` reset with a `useEffect` cleanup.** The `flushSync` stays (load-bearing: it forces the React state update and the zustand store update to commit in the same render so the snap transition sees the new layout). The `rAF` is now scheduled inside a `useEffect` with `cancelAnimationFrame` cleanup, the standard React idiom for "schedule a follow-up after commit."
- **Keep `MotionConfig reducedMotion="user"` at the app shell** (`App.tsx:131`) unchanged. `LayoutGroup` composes with it: layout animations are transforms and are skipped under reduced motion; opacity still animates. A view-level `<MotionConfig transition={…}>` would have overridden `reducedMotion` (nested `MotionConfig`s don't merge) and was rejected.
- **No spec text is removed.** The cross-section scenario is strengthened to be observable; the snap-on-reorder scenario is preserved (it is implementation-agnostic and the observable behaviour is unchanged).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `task-management`: strengthen the "Rescheduling a task to a different section" scenario to state that the source row and the destination row share one FLIP flight — the same DOM element persists from source to destination position, and no exit+enter double-animation is observed. The existing "Reordering a task via drag-and-drop snaps the result" scenario is preserved as-is; this change refactors its implementation but not its observable contract. The existing "Reduced motion disables slide and layout animations" scenario is also preserved.

## Impact

- **Code**
  - `src/features/planner/components/DayView.tsx` — wrap the return value in `<LayoutGroup id="planner-day">`. No local snap state; the view is unaware of the snap pattern.
  - `src/features/planner/components/WeekView.tsx` — same, with `id="planner-week"`.
  - `src/features/planner/components/DateBrowser.tsx` — same, with `id="planner-date"`.
  - `src/features/tasks/components/TaskList.tsx` — use `useLayoutSnap()` internally, drop the local `flushSync` + `setSnapLayout(true)` + rAF triple in `handleDragEnd`, and pass `snapLayout` to each `SortableTaskRow` / `StaticTaskRow` for the row's `transition.layout`. The `TaskList` public API (`tasks`, `emptyMessage`, `date`) is unchanged.
  - `src/features/tasks/components/TaskRow.tsx` — unchanged.
  - `src/app/App.tsx` — unchanged. `MotionConfig` continues to wrap the whole task-list-area.
- **Shared module**
  - `src/shared/utils/motion.ts` — add the `useLayoutSnap` hook. The existing `TRANSITION_*` tokens are unchanged.
  - `src/shared/utils/motion.test.ts` — new file. Six unit tests for the hook.
- **Tests**
  - Existing `TaskRow.test.tsx` and `AddTaskRow.test.tsx` — pass unchanged.
  - No `TaskList.test.tsx` exists today; not added by this change.
  - The new `motion.test.ts` covers `useLayoutSnap`.
- **Data / persistence** — none. No store changes, no schema changes, no localStorage migration.
- **Dependencies** — none added or removed. `motion@12.40.0` is already a runtime dep.
- **Performance** — `<LayoutGroup>` adds a re-measurement pass across its descendants whenever one of them changes layout. Bounded by the number of rows inside the group: `~50` for a typical day, `~350` worst case for a full week. This is a one-time cost per re-render; the existing layout animation already does equivalent per-row measurement, so the net change is neutral or a small win (motion can skip re-measuring rows that didn't change).

## Out of scope

- **Cross-section drag.** The spec says rescheduling happens via the date picker, not drag. Hoisting `DragDropProvider` to the view level would enable it but conflicts with the per-bucket group key in `scope-task-reorder-by-date`. Different change.
- **Disabling dnd-kit's drop animation.** dnd-kit's default 250ms drop slide is a small visual inconsistency with the spec's "instantly" wording but is not the focus of this change. Disabling it would be a `useSortable` `transition: { duration: 0 }` change (or a `DragOverlay` `dropAnimation={null}`) and a separate spec-clarification if the team decides to enforce "instantly" strictly.
- **Switching dnd-kit to motion's `Reorder.Group`.** Tradeoff is bundle weight (gain) versus accessibility/keyboard support (loss). Different change.
- **Micro-interactions on row chrome** (checkbox tick pulse, pomo count flip, focus button ring, overdue pill slide, chevron rotate on the group chip popover, drag-handle scale-up). All separate from the FLIP/snap concerns and have their own spec implications.
- **CSS duration token unification** (`duration-100/120/140/200` scattered across the planner) to align with the motion presets. Different change, touches the design system rather than the animation system.
- **View Transitions API for view switch** (Today → Tomorrow crossfade). Spec currently forbids view-switch animation; would be a spec change, not just an implementation change.
- **Bundle-size audit** of `motion` (full vs `motion/react-m` mini) for planner rows. Different change; the planner only uses layout/enter/exit which is well-served by either, but a switch would touch imports across the planner.
