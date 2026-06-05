## 1. Dependency

- [ ] 1.1 Install `motion` (motion.dev) as a runtime dependency. Run `npm install motion` and verify `package.json` reflects the new dep and `node_modules/motion/package.json` shows the latest stable version.
- [ ] 1.2 Verify the React adapter is reachable: confirm `node_modules/motion/react` exports `motion`, `AnimatePresence`, `MotionConfig`, and `LayoutGroup`.

## 2. Shared motion config

- [ ] 2.1 Create `src/shared/motion.ts` exporting:
  - `EASE_OUT: [number, number, number, number] = [0.2, 0, 0, 1]`
  - `EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1]`
  - `TRANSITION_ENTER: Transition` (duration 0.16, ease EASE_OUT)
  - `TRANSITION_EXIT: Transition` (duration 0.14, ease EASE_IN)
  - `TRANSITION_MOVE: Transition` (duration 0.22, ease EASE_OUT)
  - `TRANSITION_TOGGLE: Transition` (duration 0.14, ease EASE_OUT)
- [ ] 2.2 Add a barrel re-export from `src/shared/motion/index.ts` (or rely on direct path import — match the convention used by `src/shared/lib/utils.ts` and `src/shared/dates.ts`).

## 3. Animate TaskList

- [ ] 3.1 In `src/features/tasks/components/TaskList.tsx`, import `AnimatePresence` and `motion` from `motion/react`, and the four `TRANSITION_*` from `@/shared/motion`.
- [ ] 3.2 Wrap the existing `tasks.map(...)` inside the `<DragDropProvider>` in `<AnimatePresence mode="popLayout" initial={false}>`.
- [ ] 3.3 Convert `DroppableTaskRow`'s outer `<div ref={droppableRef}>` to a `motion.div`. Keep the inner `<div ref={draggableRef}>` unchanged. Add props:
  - `layout="position"`
  - `layoutId={task.id}`
  - `initial={{ opacity: 0, y: -6 }}`
  - `animate={{ opacity: task.completed ? 0.52 : 1, y: 0 }}`
  - `exit={{ opacity: 0, y: -6 }}`
  - `transition={{ opacity: TRANSITION_TOGGLE, y: TRANSITION_ENTER, layout: snapLayout ? { duration: 0 } : TRANSITION_MOVE }}` (see 3.5)
- [ ] 3.4 Confirm `useDraggable` and `useDroppable` refs still attach correctly through `motion.div`. (Motion forwards refs; no extra wiring needed.)
- [ ] 3.5 Add a `snapLayout` state in `TaskList` and a `flushSync`-wrapped `setSnapLayout(true) + reorderTasks(...)` in `handleDragEnd` to suppress the layout transition on the render that follows a DND drop. Clear via `requestAnimationFrame`. Pass `snapLayout` down to `DroppableTaskRow`; `DroppableTaskRow` selects the snap transition when `snapLayout` is true. (DND drop must look identical to today's behaviour.)

## 4. Move opacity off TaskRow className

- [ ] 4.1 In `src/features/tasks/components/TaskRow.tsx`, remove the `task.completed && 'opacity-[0.52]'` className from the outer div's `cn(...)` call. All other classes (`transition-background`, `bg-accent-bg`, `bg-overdue-bg`, focus/hover handlers) stay.

## 5. Wire MotionConfig in App

- [ ] 5.1 In `src/app/App.tsx`, import `MotionConfig` from `motion/react`.
- [ ] 5.2 Wrap the existing `<div className="task-list-area py-1 pb-10">` in `<MotionConfig reducedMotion="user">`. The `AddTaskRow` and `{renderView()}` stay as children of the wrapped div.
- [ ] 5.3 Do NOT add `MotionConfig` at the top-level `<App>` — scope it to the task list area only so the popover/sheet animations from base-ui are not affected.

## 6. Verification

- [ ] 6.1 Run `npm run format`. Confirm Prettier reorders no imports incorrectly (motion is a new external dep; the sort-imports plugin may need a manual tweak on the first run).
- [ ] 6.2 Run `npm run typecheck`. Confirm `tsc -b` exits clean.
- [ ] 6.3 Run `npm run lint`. Confirm no new ESLint errors (unused imports in particular).
- [ ] 6.4 Run `npm run test`. Confirm `TaskRow.test.tsx`, `store.test.ts`, and any planner/timer tests pass unmodified.
- [ ] 6.5 Manual smoke: in a browser, with a clean localStorage, add 3 tasks, delete the middle one. Confirm the bottom two glide up smoothly during the exit. Toggle one task complete. Confirm the opacity tween is smooth. Reschedule a task to a different date. Confirm the row leaves one section and arrives in another. Switch from Today to Tomorrow. Confirm no animation on the view swap. Drag-reorder a task. Confirm the row lands in its new position instantly, with no slide.
- [ ] 6.6 Manual smoke: in DevTools, simulate `prefers-reduced-motion: reduce` (Rendering → Emulate CSS media feature). Reload. Confirm no slide or layout animation plays; confirm opacity tween on toggle is at most a brief fade or instant.
- [ ] 6.7 Manual smoke: reload the app with existing tasks in localStorage. Confirm the list appears at its final layout instantly with no enter animation playing.
