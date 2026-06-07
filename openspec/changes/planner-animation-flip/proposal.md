## Why

The animation system added in `2026-06-05-task-row-transitions` has two related defects that share a single fix. First, the spec scenario "Rescheduling a task to a different section animates the cross-section move" is **not satisfied by the current code**: the two `TaskList` instances inside `DayView` (and the seven-plus inside `WeekView`) live in separate `<AnimatePresence>` boundaries with no `<LayoutGroup>` ancestor, so a reschedule produces two independent fades (one exit in the source section, one enter in the destination) instead of one continuous FLIP flight. Second, the "drag snap" behaviour on reorder is implemented with a `flushSync` + `setSnapLayout(true)` + `requestAnimationFrame(() => setSnapLayout(false))` triple in `TaskList.tsx:38-42` that coordinates React state with a zustand store update; the `requestAnimationFrame` is racy (a sibling re-render can land in the wrong frame) and the pattern has to be drilled into every sortable row.

`motion` ships `<LayoutGroup>`, the primitive that solves both. Wrapping each view's sections in one `<LayoutGroup>` lets the shared `layoutId={task.id}` bridge the source and destination `AnimatePresence` for a true FLIP, and its `transition` prop is the natural home for the snap-once transition — replacing the per-row `transition.layout` override and the rAF reset with a single declarative prop on the parent.

## Prerequisites

The change `scope-task-reorder-by-date` (in progress, not yet applied) restructures `TaskList` to add a tristate `date` prop and an isolated per-bucket `useSortable` group. It explicitly preserves the current `setSnapLayout` + `flushSync` + `rAF` snap pattern in its design decisions. This change **depends on it being applied first** so the snap refactor operates on the post-change `TaskList` shape, not the current one. Apply `scope-task-reorder-by-date` before starting this one.

## What Changes

- **Add `<LayoutGroup>` to each view** with a view-scoped `id`:
  - `DayView` — one `LayoutGroup` spans the Overdue section (if any) and the main section.
  - `WeekView` — one `LayoutGroup` spans the Overdue section (if any) and all per-day sections.
  - `DateBrowser` — one `LayoutGroup` wraps the stepper and the single task list. (One section today, but the wrapper keeps the API uniform and future-proofs for splitting browse into past/future groups.)
  - IDs: `id="planner-day"`, `id="planner-week"`, `id="planner-date"`. Per-view scopes prevent layoutId collision across views (relevant only if two views are ever mounted side by side) and prevent cross-view FLIP attempts when the user switches tabs.
- **Hoist the snap-on-reorder transition to `<LayoutGroup>`.** The `<LayoutGroup>` carries a `transition` prop whose `layout` is either `{ duration: 0 }` (snap frame) or `TRANSITION_MOVE` (normal frame), driven by a single `snapLayout` boolean local to the view. Per-row `motion.div`s drop the `transition.layout` branch.
- **Drop the per-row `snapLayout` prop drilling.** The boolean lives in the view (or a small hook), not in `TaskList`. The snap is a layout-level concern; the row shouldn't have to know.
- **Replace the `requestAnimationFrame` reset with a `useEffect` cleanup.** The `flushSync` stays (load-bearing: it forces the React state update and the zustand store update to commit in the same render so the snap transition sees the new layout). The `rAF` becomes a `useEffect` with `cancelAnimationFrame` cleanup, which is the standard React idiom for "schedule a follow-up after commit" and is no longer racy against a re-render.
- **Keep `MotionConfig reducedMotion="user"` at the app shell** (`App.tsx:131`) unchanged. `LayoutGroup` composes with it: layout animations are transforms and are skipped under reduced motion; opacity still animates.
- **No spec text is removed.** The cross-section scenario is strengthened to be observable; the snap-on-reorder scenario is preserved (it is implementation-agnostic and the observable behaviour is unchanged).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `task-management`: strengthen the "Rescheduling a task to a different section" scenario to state that the source row and the destination row share one FLIP flight — the same DOM element persists from source to destination position, and no exit+enter double-animation is observed. The existing "Reordering a task via drag-and-drop snaps the result" scenario is preserved as-is; this change refactors its implementation but not its observable contract. The existing "Reduced motion disables slide and layout animations" scenario is also preserved.

## Impact

- **Code**
  - `src/features/planner/components/DayView.tsx` — wrap the return value in `<LayoutGroup id="planner-day">`; introduce a local `snapLayout` state for the snap-once transition.
  - `src/features/planner/components/WeekView.tsx` — same, with `id="planner-week"`.
  - `src/features/planner/components/DateBrowser.tsx` — same, with `id="planner-date"`.
  - `src/features/tasks/components/TaskList.tsx` — drop the `snapLayout` prop and the `transition.layout` branch from `SortableTaskRow`'s `motion.div`. The `flushSync` + `setSnapLayout(true)` + rAF pattern in `handleDragEnd` moves up to the view-level wrapper.
  - `src/features/tasks/components/TaskRow.tsx` — unchanged.
  - `src/app/App.tsx` — unchanged. `MotionConfig` continues to wrap the whole task-list-area.
- **Shared module**
  - `src/shared/utils/motion.ts` — no change. The existing `TRANSITION_MOVE` and other presets are reused; no new constants are introduced.
- **Tests**
  - `src/features/tasks/components/TaskList.test.tsx` and `TaskRow.test.tsx` — should pass unchanged. The internal `motion.div` props are still correct, just expressed in fewer branches.
  - Optional: add a `LayoutGroup` smoke test that renders a view-level wrapper and asserts it produces the expected DOM (one `LayoutGroup` ancestor, no double `AnimatePresence` for the cross-section case).
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
