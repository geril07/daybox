## 1. Shared motion utility: `useLayoutSnap` hook

- [ ] 1.1 Add a `useLayoutSnap` export to `src/shared/utils/motion.ts`. The hook returns `{ snapLayout, snap }` where `snapLayout` is a boolean and `snap(applyChange: () => void) => void` runs `applyChange` inside a `flushSync` block that also sets `snapLayout` to `true`. The hook uses a `useEffect` that schedules a `requestAnimationFrame` to reset `snapLayout` to `false`, with `cancelAnimationFrame` cleanup.
- [ ] 1.2 Add a one-line comment above the `flushSync` call explaining why it is load-bearing: it forces the React state update (`setSnapLayout(true)`) and the caller's store action to commit in the same render so motion measures the new layout with the snap transition.
- [ ] 1.3 Add a unit test for the hook in `src/shared/utils/motion.test.ts` (new file if it does not exist) covering: (a) `snapLayout` is `false` initially, (b) `snap(...)` flips it to `true`, (c) the reset rAF is cancelled on unmount, (d) a second `snap(...)` call within the snap window extends the snap rather than nesting.

## 2. TaskList: accept `snap` prop, drop the local snap pattern

- [ ] 2.1 Add `snap: (applyChange: () => void) => void` to `TaskListProps` in `src/features/tasks/components/TaskList.tsx`. (The `date?: string | null` prop is added by the prerequisite change `scope-task-reorder-by-date`; this change assumes that prop is already in place.)
- [ ] 2.2 Remove the local `snapLayout` `useState`, the `flushSync` block in `handleDragEnd`, and the `requestAnimationFrame(() => setSnapLayout(false))` line. Replace them with a single call: `snap(() => reorderTasks(date, reorderedIds))`.
- [ ] 2.3 Drop the `snapLayout` prop drilling from `TaskList` to `SortableTaskRow`.
- [ ] 2.4 In `SortableTaskRow`, remove the `transition` ternary. The `motion.div`'s `transition` simplifies to `{ opacity: TRANSITION_TOGGLE, y: TRANSITION_ENTER }`. `layout: TRANSITION_MOVE` now comes from the parent `<LayoutGroup>` and is inherited by all descendants that opt into `layout="position"`.
- [ ] 2.5 Verify no other call site of the old pattern exists (the local `snapLayout` state, the `flushSync` import, the `setSnapLayout` setter) by grepping `src/**` for `snapLayout` and `setSnapLayout` — both should return zero matches after the refactor.

## 3. Wrap views in `<LayoutGroup>` with snap-driven transition

- [ ] 3.1 In `src/features/planner/components/DayView.tsx`: import `LayoutGroup` from `motion/react` and `useLayoutSnap` from `@/shared/utils/motion`. Wrap the return value (after the early-return `EmptyState` branch) in `<LayoutGroup id="planner-day" transition={{ layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE }}>`. The `snap` returned by the hook is passed to the two `<TaskList>` children as a prop.
- [ ] 3.2 In `src/features/planner/components/WeekView.tsx`: same as 3.1, with `id="planner-week"`. The single `snap` instance is shared across all per-day `TaskList`s in the week (and the Overdue `TaskList` if present, though Overdue is `date === undefined` and is read-only — confirm in `scope-task-reorder-by-date` design whether it accepts the `snap` prop regardless).
- [ ] 3.3 In `src/features/planner/components/DateBrowser.tsx`: same as 3.1, with `id="planner-date"`. The single `TaskList` receives the `snap` prop.
- [ ] 3.4 Verify no `TaskList` call site in `src/features/planner/**` or `src/features/tasks/**` is missing the `snap` prop. A TypeScript error will catch any miss; resolve by passing `snap` from the surrounding `useLayoutSnap` (or, for tests, by providing a no-op `snap`).

## 4. Verification

- [ ] 4.1 Run `npm run format`. Confirm no formatting drift.
- [ ] 4.2 Run `npm run typecheck`. Confirm no type errors, including at the `TaskList` prop-drill site in all three views and the new `useLayoutSnap` export.
- [ ] 4.3 Run `npm run lint`. Confirm no new lint warnings.
- [ ] 4.4 Run `npm run test`. Confirm the existing test suite passes unchanged, and the new `useLayoutSnap` unit tests pass.
- [ ] 4.5 Manual check in `npm run dev`:
  - (a) Seed tasks for today, tomorrow, and a past date. Switch to Today. Drag a task from Overdue to Today by rescheduling it via the date picker. Confirm the row visibly travels from the Overdue position to the Today position as one continuous motion (no two-fade gap).
  - (b) In the same view, drag a task to a new position. Confirm the dragged row lands instantly (snap), and that a subsequent delete on a sibling row reverts to the smooth `TRANSITION_MOVE` animation.
  - (c) Switch from Today to This Week. Confirm no animation crosses the view-switch boundary (a task present in both views does not FLIP-animate across the tab switch).
  - (d) With `prefers-reduced-motion: reduce` enabled in the OS or dev tools, repeat (a) and (b). Confirm the cross-section and reorder animations collapse to instant (motion's `reducedMotion="user"` config in `App.tsx:131` is unchanged).
