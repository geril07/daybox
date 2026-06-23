## 1. TimerBar UI

- [x] 1.1 Import the `X` icon from `lucide-react` in `TimerBar.tsx`
- [x] 1.2 Subscribe to `setFocusedTaskId` from `useTimerStore` in `TimerBar.tsx`
- [x] 1.3 Add a `handleClearFocus` handler that calls `setFocusedTaskId(null)` (no other state mutation)
- [x] 1.4 Render a clear-affordance button at the trailing edge of the "Working on…" row, visible only when `focusedTaskId !== null`
- [x] 1.5 Style the button: `variant="ghost"` sized to match the row's muted text; `title` and `aria-label` set to `Clear focus`

## 2. Tests

- [x] 2.1 Add case: clear button is hidden when `focusedTaskId` is `null`
- [x] 2.2 Add case: clear button is visible when `focusedTaskId` is set and the task exists in the store
- [x] 2.3 Add case: clear button is visible when `focusedTaskId` is set but the task is not in the store (stale)
- [x] 2.4 Add case: clicking the clear button sets `focusedTaskId` to `null`
- [x] 2.5 Add case: clicking the clear button leaves `phase`, `elapsed`, `isRunning`, `startedAt`, and `sessionPomoCount` unchanged

## 3. Verification

- [x] 3.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, `npm run test` and ensure all pass
