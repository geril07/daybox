## 1. Shared motion utility: `useLayoutSnap` hook

- [x] 1.1 Add a `useLayoutSnap` export to `src/shared/utils/motion.ts`. The hook returns `{ snapLayout, snap }` where `snapLayout` is a boolean and `snap(applyChange: () => void) => void` runs `applyChange` inside a `flushSync` block that also sets `snapLayout` to `true`. The hook uses a `useEffect` that schedules a `requestAnimationFrame` to reset `snapLayout` to `false`, with `cancelAnimationFrame` cleanup.
- [x] 1.2 Add a one-line comment above the `flushSync` call explaining why it is load-bearing: it forces the React state update (`setSnapLayout(true)`) and the caller's store action to commit in the same render so motion measures the new layout with the snap transition.
- [x] 1.3 Add a unit test for the hook in `src/shared/utils/motion.test.ts` (new file if it does not exist) covering: (a) `snapLayout` is `false` initially, (b) `snap(...)` flips it to `true`, (c) the reset rAF is cancelled on unmount, (d) a second `snap(...)` call within the snap window extends the snap rather than nesting.

## 2. TaskList: use `useLayoutSnap` internally, drop the local snap pattern

- [x] 2.1 Add `useLayoutSnap` to the `TaskList` body. (The `date?: string | null` prop is added by the prerequisite change `scope-task-reorder-by-date`; this change assumes that prop is already in place.)
- [x] 2.2 Remove the local `snapLayout` `useState`, the `flushSync` block in `handleDragEnd`, and the `requestAnimationFrame(() => setSnapLayout(false))` line. Replace them with a single call: `snap(() => reorderTasks(date, reorderedIds))`.
- [x] 2.3 Pass `snapLayout` to `SortableTaskRow` (kept as a prop; the view does not need to know about the snap).
- [x] 2.4 In `SortableTaskRow` and `StaticTaskRow`, restore the `layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE` branch in the `transition` object. (`LayoutGroup` does **not** accept a `transition` prop in motion@12 — only `id` and `inherit` — so the snap must live on each row's `transition.layout`.)
- [x] 2.5 Verify no other call site of the old pattern exists (the local `snapLayout` state, the `flushSync` import, the `setSnapLayout` setter) by grepping `src/**` for `snapLayout` and `setSnapLayout` — both should return zero matches after the refactor. (The only remaining references are in `motion.ts` and `motion.test.ts`, which is the new hook and its test.)

## 3. Wrap views in `<LayoutGroup>` for cross-section FLIP

- [x] 3.1 In `src/features/planner/components/DayView.tsx`: import `LayoutGroup` from `motion/react`. Wrap the return value (after the early-return `EmptyState` branch) in `<LayoutGroup id="planner-day">`. No `transition` prop on the LayoutGroup — cross-section FLIP is enabled by the `id` (which scopes layout measurement to this view).
- [x] 3.2 In `src/features/planner/components/WeekView.tsx`: same as 3.1, with `id="planner-week"`.
- [x] 3.3 In `src/features/planner/components/DateBrowser.tsx`: same as 3.1, with `id="planner-date"`.
- [x] 3.4 Verify no `TaskList` call site in `src/features/planner/**` or `src/features/tasks/**` is missing a required prop. (The `TaskList` API did not change; no new props are required at the call sites.)

## 4. Verification

- [x] 4.1 Run `npm run format`. Confirm no formatting drift. (One file touched by prettier: `TaskList.tsx`, prop order on `<SortableTaskRow>`.)
- [x] 4.2 Run `npm run typecheck`. Confirm no type errors. (Initially failed with 3 errors in views because `<LayoutGroup>` does not accept a `transition` prop; resolved by removing the `transition` prop and pushing the snap to the row level.)
- [x] 4.3 Run `npm run lint`. Confirm no new lint warnings.
- [x] 4.4 Run `npm run test`. Confirm the existing test suite passes unchanged, and the new `useLayoutSnap` unit tests pass. (12 files, 154 tests, all green.)
- [ ] 4.5 Manual check in `npm run dev` (deferred — needs human eyes):
  - (a) Seed tasks for today, tomorrow, and a past date. Switch to Today. Reschedule a task from a past date to today via the date picker. Confirm the row visibly travels from the source position to the destination position as one continuous motion (no two-fade gap).
  - (b) In the same view, drag a task to a new position. Confirm the dragged row lands instantly (snap), and that a subsequent delete on a sibling row reverts to the smooth `TRANSITION_MOVE` animation.
  - (c) Switch from Today to This Week. Confirm no animation crosses the view-switch boundary (a task present in both views does not FLIP-animate across the tab switch).
  - (d) With `prefers-reduced-motion: reduce` enabled in the OS or dev tools, repeat (a) and (b). Confirm the cross-section and reorder animations collapse to instant (motion's `reducedMotion="user"` config in `App.tsx:131` is unchanged).
