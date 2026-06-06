## 1. Store: fix the cycle counter (load-bearing)

- [x] 1.1 In `advancePhase` (`src/features/timer/store.ts`), change the `sessionPomoCount` update rule to: reset to 0 when the completed phase is `longBreak`, increment by 1 when the completed phase is `focus`, leave unchanged when the completed phase is `shortBreak`
- [x] 1.2 Verify `getNextPhase` is unchanged and now fires `longBreak` correctly with the corrected count
- [x] 1.3 Add a store unit test covering a full cycle (focus→short→…→long) asserting `sessionPomoCount` progression and that a long break fires at `longBreakInterval`

## 2. Store: reset actions

- [x] 2.1 Keep `reset()` as the restart-current-interval action (no behavior change)
- [x] 2.2 Add a `resetSession()` action setting `{ phase: 'focus', sessionPomoCount: 0, elapsed: 0, startedAt: null, isRunning: false }`
- [x] 2.3 Confirm `setPhase` leaves `sessionPomoCount` untouched; add/adjust a test asserting manual `setPhase` does not change the count
- [x] 2.4 Add tests for `resetSession()` and for the restart-vs-reset-session conditions (intervalDirty / cycleDirty)

## 3. TimerBar: phase identity

- [x] 3.1 Add the ambient phase tint to the bar root background for break phases only (focus stays neutral `bg-card`), derived from the phase color variables
- [x] 3.2 Add the phase chip (`FOCUS` / `SHORT BREAK` / `LONG BREAK`) adjacent to the time digits, using the phase color
- [x] 3.3 Remove the phase label from the focused-task block and render the task on its own line (e.g. `Working on …`) with no phase header
- [x] 3.4 Remove `border-t border-border` from the `TimerBar` root

## 4. TimerBar: phase switcher

- [x] 4.1 Make the phase chip a Popover trigger (mirroring the `GroupChip` pattern in `AddTaskRow.tsx`) listing Focus / Short break / Long break
- [x] 4.2 Wire each option to call `setPhase(phase)`; mark the current phase as selected
- [x] 4.3 Verify switching resets the interval clock to the target phase duration and does not change `sessionPomoCount`

## 5. TimerBar: cycle indicator

- [x] 5.1 Keep the session dots as read-only display (length = `longBreakInterval`, fill = `sessionPomoCount`); ensure no click handlers
- [x] 5.2 Add the short cycle text label (e.g. `2 of 4 · long next`) next to the dots

## 6. TimerBar: progressive reset control

- [x] 6.1 Compute armed action from store state: `intervalDirty = elapsed > 0 || isRunning`; `cycleDirty = sessionPomoCount > 0 || phase !== 'focus'`
- [x] 6.2 Render one reset control that calls `reset()` when intervalDirty, `resetSession()` when clean-but-cycleDirty, and is disabled when pristine
- [x] 6.3 Set the label/tooltip to reflect the armed action (`Restart` / `Reset session`)

## 7. Verify

- [x] 7.1 Run the test suite and lint; confirm all timer tests pass
- [ ] 7.2 Manual check in both light and dark themes: tint visible on breaks, chip switches phase, dots/label fill correctly across a cycle, long break fires, reset shows correct label and behaves per state
