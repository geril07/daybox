## 1. Strip motion from TaskList

- [x] 1.1 Remove `motion` and `AnimatePresence` imports from `TaskList.tsx`
- [x] 1.2 Remove `TRANSITION_ENTER`, `TRANSITION_MOVE`, `TRANSITION_TOGGLE`, `useLayoutSnap` imports
- [x] 1.3 Replace outer `AnimatePresence` + `motion.div` empty/list toggle with plain JSX (`tasks.length === 0 ? <div>empty</div> : <div>list</div>`)
- [x] 1.4 Replace inner `AnimatePresence mode="popLayout"` wrappers (sortable and static branches) with plain fragment `<>...</>` mapping
- [x] 1.5 Replace `SortableTaskRow`'s `motion.div` with plain `<div ref={ref}>` — drop `layout`, `layoutId`, `initial`, `animate`, `exit`, `transition` props
- [x] 1.6 Replace `StaticTaskRow`'s `motion.div` with plain `<div>` — same prop removal
- [x] 1.7 Remove `useLayoutSnap()` call and `snap(` wrapper — call `reorderTasks(date, reorderedIds)` directly in `handleDragEnd`
- [x] 1.8 Remove `snapLayout` prop from `SortableTaskRow` and `StaticTaskRow` — no longer needed
- [x] 1.9 Keep `taskDragSensor.ts` as a pure utility (no React, only `@dnd-kit/dom` import) — import from it in `TaskList.tsx`
- [x] 1.10 Verify `taskDragSensor.ts` no longer unused — it contains the activation constraint function needed by `TaskList.tsx`

## 2. Remove LayoutGroup from planner views

- [x] 2.1 In `DayView.tsx`: remove `import { LayoutGroup } from 'motion/react'`, unwrap `<LayoutGroup id="planner-day">` → plain fragment `<>...</>`
- [x] 2.2 In `WeekView.tsx`: remove `import { LayoutGroup } from 'motion/react'`, unwrap `<LayoutGroup id="planner-week">` → plain fragment
- [x] 2.3 In `LaterView.tsx`: remove `import { LayoutGroup } from 'motion/react'`, unwrap `<LayoutGroup id="planner-later">` → plain fragment
- [x] 2.4 In `DateBrowser.tsx`: remove `import { LayoutGroup } from 'motion/react'`, unwrap `<LayoutGroup id="planner-date">` → plain fragment

## 3. Remove MotionConfig from App

- [x] 3.1 In `App.tsx`: remove `import { MotionConfig } from 'motion/react'`
- [x] 3.2 Unwrap `<MotionConfig reducedMotion="user">` → remove the wrapper, keep children unchanged

## 4. Remove shared motion utility

- [x] 4.1 Delete `src/shared/utils/motion.ts`
- [x] 4.2 Delete `src/shared/utils/motion.test.ts`

## 5. Cleanup dependencies and verify

- [x] 5.1 Check if `motion` is imported anywhere else in `src/` — not found, ran `npm uninstall motion`
- [x] 5.2 Check if `@dnd-kit/dom` is still used (it is, via `taskDragSensor.ts`) — kept
- [x] 5.3 Run `npm run typecheck` and fix any errors
- [x] 5.4 Run `npm run lint` and fix any warnings
- [x] 5.5 Run `npm run format`
- [x] 5.6 Run `npm run test` — all 252 tests pass across 24 files
- [ ] 5.7 Manual smoke test: create, delete, reorder, complete tasks — verify instant updates with no motion animation, CSS transitions still working
