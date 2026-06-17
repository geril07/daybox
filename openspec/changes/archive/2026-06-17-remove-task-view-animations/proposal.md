## Why

Framer-motion-based task view animations (entrance/exit/layout, `LayoutGroup` in planner views) add complexity and dependencies (`motion`, `useLayoutSnap` flushSync hack) without proportionally improving the user experience. Removing the motion layer simplifies the component tree, eliminates the `useLayoutSnap` hook, reduces bundle size, and makes the codebase easier to reason about. CSS transitions on interactive elements are deliberately kept — they are lightweight, have zero JS overhead, and provide useful micro-interaction feedback.

## What Changes

- Remove `motion` (framer-motion) and `AnimatePresence` from `TaskList.tsx` — task rows render as plain `<div>` elements with no entrance/exit/layout/reorder/toggle animations
- Remove `LayoutGroup` from all four planner views (`DayView`, `WeekView`, `LaterView`, `DateBrowser`)
- Remove `MotionConfig reducedMotion="user"` from `App.tsx`
- Remove the shared `src/shared/utils/motion.ts` and `motion.test.ts` files (the `useLayoutSnap` hook and all transition tokens)
- Remove the `taskDragSensor.ts` file — inline the activation constraint into `TaskList.tsx`
- DnD-kit drag reorder remains functional but without the `useLayoutSnap` snap mechanism; rows update immediately on reorder via store reactivity
- **BREAKING**: Removes the `motion` package dependency (if no other module uses it after removal)
- CSS transitions on `TaskRow`, `AddTaskRow`, and `TaskActionSheet` are **kept as-is** (hover opacity, background, check button, pomodoro progress bar, date picker, etc.)

## Capabilities

### New Capabilities

None. This change removes animation behavior only.

### Modified Capabilities

- `task-management`: Remove the "Task rows animate on enter, exit, and reorder" requirement (and all its scenarios). Remove animation references from sheet delete requirement (line 119: "animates out" → "is removed immediately") and reorder requirement (line 165: remove snap animation behavior). CSS transition requirements (drag handle, pomodoro progress bar) are unchanged.

## Impact

- Affected modules: `tasks` (TaskList, taskDragSensor), `planner` (DayView, WeekView, LaterView, DateBrowser), `app` (App.tsx)
- Affected shared: `shared/utils/motion.ts`, `shared/utils/motion.test.ts`
- Dependencies: `motion` package may be removable if no other module imports it; `@dnd-kit/dom` (PointerActivationConstraints) may be removable if `taskDragSensor.ts` is the only consumer
- Tests: `motion.test.ts` removed; `TaskList.sortable.test.tsx` may need updates to remove animation assertions
