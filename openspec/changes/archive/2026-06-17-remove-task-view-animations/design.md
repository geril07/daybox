## Context

DayBox currently uses `motion` (framer-motion) for task row entrance/exit/layout/reorder animations. Planner views wrap `TaskList` instances in `LayoutGroup` to coordinate cross-section layout animations. A shared `motion.ts` utility exports transition tokens and a `useLayoutSnap` hook that uses `flushSync` to force-zero layout animation duration during drag-end reorders. `App.tsx` wraps the app in `MotionConfig reducedMotion="user"`. CSS transitions on task-row elements (hover opacity, background, check button, progress bar, date picker) are lightweight and will be kept.

The motion layer will be stripped. Task rows become plain `<div>` elements with instantaneous mount/unmount/reorder. DnD-kit drag reorder is preserved but simplified — no snap mechanism, no layout animation. CSS transitions remain untouched.

## Goals / Non-Goals

**Goals:**

- Remove all `motion` (framer-motion) usage from task and planner components
- Remove `AnimatePresence`, `motion.div`, `LayoutGroup`, `MotionConfig` from the component tree
- Remove `src/shared/utils/motion.ts` and its test file
- Simplify `TaskList.tsx` — plain `<div>` wrappers instead of `motion.div` + `AnimatePresence`
- Keep dnd-kit drag reorder functional without animation overhead
- Remove `package.json` dependency on `motion` if no other module uses it

**Non-Goals:**

- Do NOT remove CSS transition classes from `TaskRow`, `AddTaskRow`, `TaskActionSheet` — kept as-is (hover opacity, background, check button, pomodoro progress bar, date picker, etc.)
- Do NOT remove animation classes from shared UI primitives (`sheet.tsx`, `popover.tsx`, `select.tsx`, `menu.tsx`, `button.tsx`, `switch.tsx`, `slider.tsx`, `tabs.tsx`) — those are framework-level shell behavior, not task views
- Do NOT remove `tw-animate-css` or `shadcn/tailwind.css` from `index.css`
- Do NOT change dnd-kit reorder API or store behavior (only strip the motion wrapping)
- Do NOT remove `@dnd-kit/react`, `@dnd-kit/helpers`, or `@dnd-kit/dom` (still needed for drag reorder and pointer activation constraints)

## Decisions

### Decision 1: Remove motion imports entirely rather than conditionally disable

**Chosen**: Strip all `motion` imports and usages from `TaskList.tsx`, planner views, and `App.tsx`. Replace `motion.div` with plain `<div>`, remove `AnimatePresence` wrappers, remove `LayoutGroup` wrappers.

**Alternatives considered**:

- Keep `motion` but disable animations globally via `MotionConfig reducedMotion="always"` — still requires the dependency and all the wrapper components; defeats the purpose of removing complexity.
- Conditionally render animated vs static rows — adds branching complexity; the goal is to simplify, not add conditions.

**Rationale**: The dependency itself is the complexity tax. Removing it entirely eliminates bundle size, the `useLayoutSnap` hook, the transition token exports, and the mental overhead of reasoning about layout animations interacting with zustand store updates.

### Decision 2: Keep dnd-kit drag reorder but without useLayoutSnap

**Chosen**: Remove the `useLayoutSnap` hook and `flushSync` snap mechanism. On `handleDragEnd`, call `reorderTasks` directly. Store update triggers a normal React re-render; rows appear in their new positions immediately.

**Alternatives considered**:

- Remove dnd-kit entirely — drag reorder is a core interaction, not purely animation. Removing it would be a functional regression.
- Keep `useLayoutSnap` without motion — the hook's entire purpose is to force `layout` prop `duration: 0` on motion.div. Without motion, there is nothing to snap.

**Rationale**: The store is already reactive. When `reorderTasks` mutates sort orders and `selectForDate` re-computes the ordered list, React re-renders the row array in the new order. No animation means no snap needed.

### Decision 3: Keep CSS transitions on task-row elements

**Chosen**: Do not touch any `transition-*` / `duration-*` classes in `TaskRow.tsx`, `AddTaskRow.tsx`, or `TaskActionSheet.tsx`. These are pure CSS with zero JS runtime cost and provide useful micro-interaction feedback: hover reveal on drag handle and action buttons, background shifts on focus/overdue, check button fill, pomodoro progress bar width, date picker interactions.

**Alternatives considered**:

- Remove CSS transitions too — would make hover interactions feel jarring (elements blink in/out) and removes subtle state indicators (background transitions on row focus/overdue). The complexity benefit is negligible since these are standard Tailwind utility classes with no JS dependency.

**Rationale**: The goal is to remove the `motion` JS library and its associated complexity. CSS transitions are a different category — they're native browser features with no bundle cost, no state management, and no interaction with React's render cycle.

### Decision 4: Remove taskDragSensor.ts

**Chosen**: Inline the pointer activation constraint logic into `TaskList.tsx` or remove the custom sensor file and configure `PointerSensor` inline.

**Alternatives considered**:

- Keep the separate file — it's a small utility, but after removing animation, having it in a separate file is unnecessary indirection.

**Rationale**: The sensor is just a function that returns a delay for touch. It can be defined inline in `TaskList.tsx` with minimal code.

## Risks / Trade-offs

- **Risk**: Removing entrance/exit animations makes add/delete feel abrupt (UX regression)
  - **Mitigation**: Instant mount/unmount is the default behavior of the web platform; users of productivity tools often prefer speed over visual flourish. CSS transitions on remaining interactive elements (hover, background, check button) provide visual continuity. Monitor feedback.
- **Risk**: `motion` may have consumers outside task/planner modules
  - **Mitigation**: Before removing the `motion` package, verify no other files import it. If other modules use it, keep the package but still remove from task views.
- **Risk**: Removing `LayoutGroup` may break cross-section task movement in planner views
  - **Mitigation**: `LayoutGroup` only coordinates layout animations. Without motion.div and layoutId, there are no layout animations to coordinate. Task movement across sections still works — rows unmount from one list and mount in another instantly.
