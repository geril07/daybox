## Context

The planner's animation system is concentrated in `src/features/tasks/components/TaskList.tsx`. It uses `motion@12.40.0`'s `AnimatePresence`, `motion.div`, and `layoutId` to animate task rows on enter, exit, and reorder. The spec at `openspec/specs/task-management/spec.md:183-240` codifies the contract in nine scenarios (adding, deleting, reordering, rescheduling across sections, toggling complete, view-switch, reduced-motion, rehydrated first render, empty → first task).

Two defects exist against this contract:

1. **The cross-section FLIP scenario is not actually satisfied.** `DayView` renders two separate `TaskList` instances (Overdue, then Today), each with its own `AnimatePresence` and `DragDropProvider`, and no `<LayoutGroup>` ancestor at the view level. Same shape in `WeekView` (one `TaskList` per day plus optional Overdue) and `DateBrowser` (single list, but the same architectural pattern). When a task is rescheduled, motion sees one `AnimatePresence` exit the row and a _different_ `AnimatePresence` enter a row with the same `layoutId` — the global `layoutId` registry can in theory bridge them, but with no `LayoutGroup` synchronizing measurement across the two subtrees, the bridge does not happen as a single FLIP flight. The user sees two separate fades with a brief gap.

2. **The snap-on-reorder pattern is racy.** `TaskList.tsx:24-43` uses `flushSync(() => { setSnapLayout(true); reorderTasks(...) })` followed by `requestAnimationFrame(() => setSnapLayout(false))`. The `flushSync` is load-bearing: it forces the React state update and the zustand store update to commit in the same render so motion measures the new layout with the snap transition. The `rAF` is a defensive "wait one paint" that has no clear payoff — 16ms is too short to be a meaningful buffer for any async work, and it's a footgun if a re-render lands in the wrong frame.

`motion` ships `<LayoutGroup>` ([docs](https://motion.dev/docs/react-layout-group)), the primitive that solves both:

- A `<LayoutGroup>` wrapping the view's sections synchronizes layout measurement across them. A `layoutId={task.id}` can then bridge an unmount in one `AnimatePresence` and a mount in another as a single FLIP flight, satisfying the cross-section scenario.
- `<LayoutGroup>` accepts a `transition` prop. The snap-once transition (`{ layout: { duration: 0 } }` for the snap frame, `TRANSITION_MOVE` for normal frames) belongs on the `LayoutGroup`, not on each row. The per-row `transition.layout` branch and the `snapLayout` prop drilling both go away.

A concurrent change `scope-task-reorder-by-date` restructures `TaskList` to add a tristate `date` prop and per-bucket `useSortable` group keys. Its design decisions explicitly preserve the current `setSnapLayout` + `flushSync` + `rAF` pattern; this change is sequenced to apply **after** it. The proposed refactor operates on the post-change `TaskList` shape.

## Goals / Non-Goals

**Goals:**

- Cross-section task reschedules produce one continuous FLIP flight across section boundaries, satisfying `task-management/spec.md` scenario "Rescheduling a task to a different section animates the cross-section move" observably.
- The snap-on-reorder pattern lives on the view's `<LayoutGroup>`, not on every row. `TaskList`'s surface area shrinks.
- The `rAF` reset is replaced with a `useEffect` cleanup — the standard React idiom for "schedule a follow-up after commit" — and is no longer racy against a sibling re-render.
- The change is a small refactor: no new dependencies, no new files in the planner, no store or schema changes, no migration.

**Non-Goals:**

- Cross-section drag (would require hoisting `DragDropProvider` to the view level; conflicts with `scope-task-reorder-by-date`'s per-bucket group keys).
- Disabling dnd-kit's 250ms drop animation (separate concern; would require a `useSortable` `transition: { duration: 0 }` and possibly a `DragOverlay dropAnimation={null}`).
- Switching dnd-kit for motion's `Reorder.Group` (different bundle/a11y trade-off).
- Micro-interactions on row chrome, CSS duration token unification, or view-switch crossfade via the View Transitions API.
- A bundle-size audit of `motion` vs `motion/react-m` for planner rows.

## Decisions

### 1. `LayoutGroup` per view, not per app and not per list

Three placements considered:

| Placement                                       | Pros                                                                                                                                                                                                    | Cons                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per view** (DayView / WeekView / DateBrowser) | Scope matches mental context; per-view `id` namespacing is straightforward; "view switch is not animated" is preserved automatically because each view's `LayoutGroup` unmounts when the view unmounts. | Three wrappers.                                                                                                                                                                                                                                                   |
| Per app (`App.tsx`)                             | One wrapper.                                                                                                                                                                                            | Violates the spec's "view switch is not animated" rule: switching from Today to Week would try to FLIP-animate any task that exists in both views (the Overdue tasks, plus any same-day tasks). `layoutId` collisions if two views are ever mounted side by side. |
| Per `TaskList`                                  | Most local.                                                                                                                                                                                             | Defeats the point. Each `TaskList` becomes its own group with no measurement synchronization across sections, which is exactly the current bug.                                                                                                                   |

**Per view wins.** The "view switch is not animated" spec rule and the cross-section FLIP requirement are both satisfied by this scope, and the duplication is 3 imports of `LayoutGroup`.

### 2. LayoutGroup IDs are view-scoped strings, not derived from view state

- `id="planner-day"`, `id="planner-week"`, `id="planner-date"`.
- Stable string IDs, not `useId()` or per-render values, because motion's `LayoutGroup` is a context provider and re-keying it would force a remount of all descendants.
- Namespacing is good hygiene even if multiple views never coexist today; the cost is three fixed strings and the benefit is zero ambiguity if a future feature renders two views side by side (e.g., a week-and-day split view).

### 3. The snap pattern is encapsulated in a small `useLayoutSnap` hook, returning `{ snapLayout, snap }`

```ts
// src/shared/utils/motion.ts (additions)
export function useLayoutSnap() {
  const [snapLayout, setSnapLayout] = useState(false)

  useEffect(() => {
    if (!snapLayout) return
    const id = requestAnimationFrame(() => setSnapLayout(false))
    return () => cancelAnimationFrame(id)
  }, [snapLayout])

  const snap = useCallback((applyChange: () => void) => {
    flushSync(() => {
      setSnapLayout(true)
      applyChange()
    })
  }, [])

  return { snapLayout, snap }
}
```

- `snapLayout` is a boolean the view reads in its `<LayoutGroup transition={{ layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE }}>`.
- `snap` is a function the view passes to `<TaskList>`. `TaskList`'s `handleDragEnd` calls `props.snap(() => reorderTasks(date, ids))`. The hook wraps the React state flip and the store action in one `flushSync`.
- The hook is ~10 lines and replaces ~18 lines of duplication across three views. Lives in `src/shared/utils/motion.ts` to keep it next to the related `TRANSITION_*` tokens.

Alternatives considered:

- **State duplicated in each view (no hook).** Saves the hook definition; costs 18 lines of triplication. Hook wins for 3+ views.
- **State in zustand.** Mixes UI-only state into the task store; violates the architecture spec ("features own their store") and the task store's validated-persist schema. Rejected.
- **State in a context.** The view is the only consumer; the prop-drill cost is one prop. Context is overkill.

### 4. `useEffect` cleanup + `rAF` reset, not `useLayoutEffect` and not pure `useLayoutEffect` no-rAF

`useLayoutEffect` was considered and rejected for two reasons:

- `useEffect` is the idiomatic React hook for state updates and scheduled follow-ups. `useLayoutEffect` is for "read or mutate the DOM before paint." `setSnapLayout(false)` is neither.
- The `rAF` is not load-bearing (motion commits the snap transition synchronously in its own `useLayoutEffect`), but it's a cheap defensive buffer in case a future motion version defers any work async. Removing it for the sake of removing it doesn't pay off; keeping it costs one frame.

A pure `useLayoutEffect` (no `rAF`) variant — `useLayoutEffect(() => { if (snapLayout) setSnapLayout(false) }, [snapLayout])` — was considered and rejected for the same idiom reason and because it removes the buffer for no observable benefit.

### 5. `flushSync` stays

The `flushSync` in `useLayoutSnap.snap` is load-bearing: it forces the React state update (`setSnapLayout(true)`) and the zustand store update (`reorderTasks(...)`) to commit in the same render. Without it, React 18+'s auto-batching does not apply across the React/zustand boundary, and motion may commit a render with the snap transition but the old layout (or vice versa), causing either a visible slide or a confused layout.

This is the only place `flushSync` is used in the planner. It is annotated in the hook with a one-line comment explaining why it is not a code smell.

### 6. `popLayout` mode on the inner AnimatePresence is unchanged

`<AnimatePresence mode="popLayout">` (`TaskList.tsx:69`) handles within-list mount/unmount layout (the "auto-shuffle" feel when a row exits and siblings flow into place). `<LayoutGroup>` is the cross-list bridge. They compose; the existing `popLayout` setting is correct under the new `LayoutGroup` parent.

### 7. The drag handler stays in `TaskList`, but takes `snap` as a prop

`TaskList` keeps `handleDragEnd` (it owns the dnd-kit event and the validation logic). It accepts one new prop, `snap: (applyChange: () => void) => void`, and calls it in place of the local `flushSync` block:

```tsx
// TaskList.tsx (post-change)
const handleDragEnd = (event: DragEndEvent) => {
  if (date === undefined) return
  // ... existing validation ...
  const reordered = arrayMove(tasks, sourceIndex, targetIndex).map((t) => t.id)
  snap(() => reorderTasks(date, reordered))
}
```

The view passes `snap` from `useLayoutSnap()`. The view also passes the `LayoutGroup`'s `transition` (driven by `snap.snapLayout`) at its own level. `TaskList` no longer knows about the snap mechanism; it just knows "after I reorder, call `snap`."

The `SortableTaskRow`'s `motion.div` no longer carries `snapLayout` in its `transition`; the `layout: { duration: 0 }` branch is gone. The motion.div's transition shrinks to `{ opacity: TRANSITION_TOGGLE, y: TRANSITION_ENTER }`.

## Risks / Trade-offs

- **Measurement cost.** `<LayoutGroup>` re-measures descendants across the group on any layout change. Bounded by the number of rows inside the group: ~50 typical for a day, ~350 worst case for a full week. The existing per-row `layout="position"` measurement already does equivalent work; the net change is neutral or a small win because `LayoutGroup` can skip re-measuring rows whose bounding box did not change. **Mitigation:** none needed for current scale; revisit if a stress test (1000+ tasks in a week) shows a regression. Document the cost in a code comment near the `LayoutGroup`.

- **dnd-kit `useSortable` ref compatibility with `LayoutGroup`.** dnd-kit's `useSortable` returns a `ref` that is attached to the `motion.div` (`TaskList.tsx:104`). The `motion.div`'s `ref` forwarding composes with dnd-kit. `LayoutGroup` is a context provider above the `motion.div`s and does not touch their refs. No interaction expected. **Mitigation:** none needed; covered by the existing test suite.

- **Coordination with `scope-task-reorder-by-date`.** That change is in progress and not yet applied. It modifies the same `TaskList.tsx`, `DayView.tsx`, `WeekView.tsx`, `DateBrowser.tsx` files. If the two changes are applied out of order, the build will fail at the `reorderTasks` signature change. **Mitigation:** the proposal's "Prerequisites" section names the dependency. The tasks.md implementation is written against the post-`scope-task-reorder-by-date` shape; an apply attempt on this change before that one will surface the type error immediately and fail closed.

- **Cross-section drag is still impossible.** `<LayoutGroup>` enables cross-section FLIP for _reschedules_ (date change), not for _drags_. The spec doesn't require drag-rescheduling, but the asymmetry is real: a user can FLIP a task from Overdue to Today via the date picker, but cannot drag it. **Mitigation:** none for this change; flagged as a follow-up in the proposal's "Out of scope."

- **Three `LayoutGroup` instances to keep in sync.** Each view adds the same wrapper. A future refactor could hoist `LayoutGroup` to a single provider inside `App.tsx` that scopes by view via `id`, but per-view is the correct scope today. **Mitigation:** the proposal documents the placement; the design notes the alternative.

## Migration Plan

Sequential:

1. **Apply `scope-task-reorder-by-date` first.** Its `reorderTasks(date, taskIds)` signature, `TaskList` `date` prop, and per-bucket `useSortable` group key are prerequisites for this change's `TaskList` shape.
2. **Apply this change.** Tasks are:
   1. Add `useLayoutSnap` to `src/shared/utils/motion.ts`.
   2. Wrap `DayView` in `<LayoutGroup id="planner-day">` with `useLayoutSnap`-driven `transition`.
   3. Same for `WeekView` and `DateBrowser`.
   4. Refactor `TaskList.tsx` to accept a `snap` prop, drop the local `flushSync` + `rAF` pattern, drop the `transition.layout` branch from `SortableTaskRow`'s `motion.div`, and drop the `snapLayout` prop drilling.
   5. Run the full verification suite (`npm run format`, `npm run typecheck`, `npm run lint`, `npm run test`).

No persistence migration; no schema change; no new files outside `src/shared/utils/motion.ts`.

Rollback: revert the four touched files and the hook addition. No state in localStorage is affected.

## Open Questions

- **Should the hook live in `src/shared/utils/motion.ts` or a new `src/shared/hooks/useLayoutSnap.ts`?** Leaning toward `motion.ts` because the hook is conceptually an extension of the existing motion tokens. Splitting into a new directory is overhead for a single 10-line export. Decide during implementation; either is fine.
- **Should the `LayoutGroup` `id` include a `useId()`-derived suffix?** No — see decision 2. Stable strings, not per-render.
- **Should the snap transition live on the `<LayoutGroup>` (current design) or on a wrapping `motion.div` if we ever need finer control?** LayoutGroup is the right primitive today. Revisit only if a future change requires per-list snap behavior (it doesn't appear to).
