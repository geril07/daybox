## ADDED Requirements

### Requirement: Timer persistence is debounced

The `useTimerStore` SHALL persist its full state (runtime and configuration) under the `daybox-timer` localStorage key. To prevent the 1Hz `tick` from producing 1Hz `localStorage.setItem` calls, the timer store's persistence layer SHALL be debounced:

- The debounce delay SHALL be 1000 ms (one second).
- A `setItem` call that arrives while a previous call is still pending SHALL replace the pending value (not queue another write).
- A `beforeunload` event SHALL flush any pending write synchronously, so closing the tab does not lose the last in-flight second of progress.
- A `visibilitychange` event that transitions the document to `hidden` SHALL also flush any pending write, for the same reason on mobile / tab-switch.

The debounce is implemented as a wrapper around the default `localStorage` (`createDebouncedStringStorage(localStorage, 1000)`) and passed to zustand's `persist` middleware via a new `storage` option on `createValidatedPersist`. The rehydrate wall-clock-correction callback (which advances `elapsed` by `now - startedAt` and resets `startedAt` to `now` when `isRunning` is `true` on rehydrate) is unchanged and continues to live in the timer store.

The other persisted stores (tasks, groups, planner) SHALL continue to use the synchronous default `localStorage`; debouncing is timer-specific because the tick is the only 1Hz writer in the app.

#### Scenario: Timer tick does not write to localStorage every second

- **WHEN** the timer is running for 60 seconds (60 `tick` calls, each one `set({ elapsed, startedAt })`)
- **THEN** the `daybox-timer` localStorage key is written at most twice during that interval (one debounced write, plus a `beforeunload`/`visibilitychange` flush if the user closes or hides the tab)
- **AND** the writes that DO occur carry the _latest_ value of `elapsed` and `startedAt` (the debounce coalesces)

#### Scenario: Reloading the page mid-pomo resumes from the same remaining time

- **WHEN** the user starts a focus pomodoro at 25:00, the timer has elapsed 5 minutes, and the user reloads the page
- **THEN** after rehydrate, `elapsed` is approximately `5 * 60 * 1000 + (now - lastPersistedStartedAt)` ms and `startedAt` is `now`
- **AND** the timer display shows approximately 20:00 remaining
- **AND** `isRunning` is `true` so the timer continues counting

#### Scenario: Closing the tab does not lose the last tick

- **WHEN** the timer is running, the user has not paused, and the user closes the tab
- **THEN** the `beforeunload` handler flushes the pending debounced write synchronously
- **AND** the most recent `elapsed` and `startedAt` values are written to `daybox-timer` before the tab is destroyed
- **AND** on the next open, the rehydrate wall-clock correction continues from that point

#### Scenario: Other stores are not debounced

- **WHEN** `useTaskStore`, `useGroupStore`, or `usePlannerStore` mutates
- **THEN** the corresponding localStorage key is written synchronously on each mutation
- **AND** the debounce wrapper is NOT used for these stores
