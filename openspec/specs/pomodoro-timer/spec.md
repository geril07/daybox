## Purpose

A persistent Pomodoro timer docked at the bottom with full focus/break cycle, configurable durations, alarm sounds, and browser notifications.
## Requirements
### Requirement: Timer displays remaining time

The system SHALL display the remaining time in MM:SS format for the current focus or break phase.

#### Scenario: Timer shows 25:00 on idle

- **WHEN** no timer is running
- **THEN** the timer shows the full focus duration (e.g., 25:00) in a dimmed color

#### Scenario: Timer counts down

- **WHEN** the timer is running
- **THEN** the display updates every second showing remaining time

### Requirement: Timer cycles through focus/break phases

The system SHALL cycle through focus → short break → focus → ... → long break intervals. The number of focus intervals completed since the last long break SHALL be tracked by `sessionPomoCount`, which increments when a focus interval completes, is left unchanged when a short break completes, and resets to `0` when a long break completes. A long break SHALL occur when the count of completed focus intervals reaches the configured long-break interval.

#### Scenario: Focus to short break

- **WHEN** a focus interval completes and fewer than `longBreakInterval` focus intervals have completed since the last long break
- **THEN** a short break interval begins (automatically or based on the auto-start setting)
- **AND** `sessionPomoCount` has incremented by 1

#### Scenario: Long break after interval

- **WHEN** the configured number of focus intervals (default 4) completes since the last long break
- **THEN** a long break interval begins instead of a short break

#### Scenario: Count resets only after a long break

- **WHEN** a long break interval completes
- **THEN** `sessionPomoCount` resets to 0
- **AND** completing a short break does NOT reset `sessionPomoCount`

### Requirement: Timer increments task pomodoros

The system SHALL increment a task's completed-pomodoro count when a focus interval finishes and a task is bound.

#### Scenario: Increment on focus complete

- **WHEN** a focus interval finishes while a task is focused
- **THEN** the task's pomoCompleted count increases by 1

### Requirement: User can start/pause/skip/reset timer

The system SHALL provide play/pause, skip, and a single progressive reset control. The reset control SHALL behave as follows: if the current interval is dirty (time has elapsed or the timer is running) it restarts the current interval; otherwise, if the timer is mid-cycle (a focus interval has completed since the last long break, or the phase is not focus) it resets the whole session to the first focus interval with `sessionPomoCount` 0; otherwise (already a pristine first focus at full duration) the control is disabled. The control's label/tooltip SHALL reflect the action it will perform.

#### Scenario: Start timer

- **WHEN** the user clicks the play button
- **THEN** the timer starts counting down

#### Scenario: Pause timer

- **WHEN** the user clicks the pause button while the timer is running
- **THEN** the timer pauses and remaining time is preserved

#### Scenario: Skip interval

- **WHEN** the user clicks the skip button
- **THEN** the current interval ends and the next phase in sequence begins

#### Scenario: Reset restarts the current interval

- **WHEN** the current interval has elapsed time or is running, and the user activates reset
- **THEN** the current interval's clock returns to its full duration and stops
- **AND** the phase and `sessionPomoCount` are unchanged
- **AND** the control's label reflects "Restart"

#### Scenario: Reset returns to the first focus when the interval is clean

- **WHEN** the current interval is at full duration and stopped, but the timer is mid-cycle (count > 0 or phase is not focus), and the user activates reset
- **THEN** the phase becomes focus, `sessionPomoCount` becomes 0, and the clock is at the full focus duration, stopped
- **AND** the control's label reflects "Reset session"

#### Scenario: Reset is disabled when pristine

- **WHEN** the timer is a stopped first focus interval at full duration with `sessionPomoCount` 0
- **THEN** the reset control is disabled

### Requirement: Session dots show progress

The system SHALL show fixed, read-only session dots indicating how many focus intervals have completed since the last long break, one dot per focus interval in the cycle (count equal to the long-break interval). The system SHALL also show a short text label describing cycle position (e.g. "2 of 4 · long next"). The dots SHALL NOT be interactive.

#### Scenario: Session progress dots

- **WHEN** the user has completed 2 of 4 focus intervals since the last long break
- **THEN** 2 dots are filled and 2 are dimmed
- **AND** a text label conveys the same position (e.g. "2 of 4 · long next")

#### Scenario: Dots are display-only

- **WHEN** the user clicks a session dot
- **THEN** nothing happens (the dots do not switch phase or alter timer state)

### Requirement: Phase identity is shown on the timer

The system SHALL convey the current phase on the timer itself rather than on the focused-task label. The timer bar background SHALL take a faint phase tint during break phases (focus stays neutral), and a phase label (FOCUS / SHORT BREAK / LONG BREAK) SHALL be shown as a caption above the time digits. The focused-task label SHALL NOT carry the phase label.

#### Scenario: Break phase is visible at a glance

- **WHEN** the timer is in a short or long break phase
- **THEN** the bar background shows a faint tint in the phase color
- **AND** the phase chip reads the corresponding break label

#### Scenario: Focus phase background is neutral

- **WHEN** the timer is in the focus phase
- **THEN** the bar background is neutral (no break tint)
- **AND** the phase chip reads FOCUS

#### Scenario: Task label is independent of phase

- **WHEN** a task is focused
- **THEN** the task label shows the task title without a phase label

### Requirement: User can switch to a specific phase

The system SHALL let the user switch directly to a specific phase (focus, short break, or long break) via the phase chip. Switching SHALL reset the current interval's clock to the target phase's full duration and SHALL NOT change `sessionPomoCount`.

#### Scenario: Switch to a break directly

- **WHEN** the user opens the phase chip and selects "Short break" while in focus
- **THEN** the phase becomes short break with its full duration, stopped
- **AND** `sessionPomoCount` is unchanged

#### Scenario: Switching does not advance the cycle

- **WHEN** the user manually switches phases
- **THEN** `sessionPomoCount` only ever changes through interval completion, never through a manual switch

#### Scenario: Selecting a phase closes the menu

- **WHEN** the user selects a phase from the phase chip menu
- **THEN** the menu closes

### Requirement: Sound notification on interval end

The system SHALL play the configured alarm sound when an interval completes, using the selected volume and repeat count.

#### Scenario: Sound plays with configured settings

- **WHEN** an interval ends and alarmVolume > 0
- **THEN** the selected alarmSound plays at the configured volume, repeating alarmRepeat times

### Requirement: Browser notification on interval end

The system SHALL send a browser notification when an interval completes (if permitted).

#### Scenario: Notification on interval end

- **WHEN** an interval ends and browser notifications are permitted
- **THEN** a notification is shown with the interval name

### Requirement: User can configure timer durations

The system SHALL allow users to set focus duration, short break duration, and long break duration in minutes. The values SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Change focus duration

- **WHEN** user changes the focus duration input to 30
- **THEN** the timer uses 30 minutes for focus intervals on next start

#### Scenario: Persist across reload

- **WHEN** user changes focus duration to 30 and reloads the page
- **THEN** the focus duration is still 30

### Requirement: User can configure long-break interval

The system SHALL allow users to set how many pomodoros between long breaks. The value SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Change long-break interval

- **WHEN** user changes the interval input to 6
- **THEN** a long break occurs every 6 pomodoros

#### Scenario: Persist across reload

- **WHEN** user changes long-break interval to 6 and reloads the page
- **THEN** the long-break interval is still 6

### Requirement: User can toggle auto-start

The system SHALL allow users to toggle auto-start for breaks and pomodoros independently. The values SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Enable auto-start breaks

- **WHEN** user toggles auto-start breaks on
- **THEN** breaks start automatically after a focus interval ends

#### Scenario: Persist across reload

- **WHEN** user enables auto-start breaks and reloads the page
- **THEN** breaks still start automatically after a focus interval ends

### Requirement: User can select alarm sound

The system SHALL allow users to choose from multiple alarm sounds for interval completion. The selection SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Select alarm sound

- **WHEN** user selects "digital" from the alarm sound dropdown
- **THEN** the digital alarm sound plays on future interval completions

#### Scenario: Persist across reload

- **WHEN** user selects "digital" and reloads the page
- **THEN** the digital alarm sound is still selected

### Requirement: User can adjust alarm volume

The system SHALL allow users to control alarm volume with a slider. The value SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Adjust volume

- **WHEN** user drags the volume slider to 0.8
- **THEN** the alarm plays at 80% volume on interval completion

#### Scenario: Persist across reload

- **WHEN** user sets volume to 0.8 and reloads the page
- **THEN** the volume is still 0.8

### Requirement: User can set alarm repeat count

The system SHALL allow users to set how many times the alarm repeats (1-5). The value SHALL be persisted in the timer's own store under `daybox-timer`.

#### Scenario: Set repeat count

- **WHEN** user sets alarm repeat to 3
- **THEN** the alarm rings 3 times on interval completion

#### Scenario: Persist across reload

- **WHEN** user sets repeat to 3 and reloads the page
- **THEN** the repeat is still 3

### Requirement: Timer settings panel reads and writes the timer's own store

The `TimerSettingsPanel` component SHALL read the current timer configuration from `useTimerStore` and write updates via `useTimerStore` actions. The panel SHALL NOT read or write any other store for its configuration values.

#### Scenario: Panel reflects current settings

- **WHEN** the user opens the settings drawer to the Timer section
- **THEN** the inputs display the current values from `useTimerStore`

#### Scenario: Panel updates the timer's store

- **WHEN** the user changes the focus duration in the panel
- **THEN** `useTimerStore`'s `settings.focusDuration` is updated
- **AND** the value is persisted to `daybox-timer`

### Requirement: Timer persistence is debounced

The `useTimerStore` SHALL persist its full state (runtime and configuration) under the `daybox-timer` localStorage key. To prevent the 1Hz `tick` from producing 1Hz `localStorage.setItem` calls, the timer store's persistence layer SHALL be debounced:

- The debounce delay SHALL be 1000 ms (one second).
- A `setItem` call that arrives while a previous call is still pending SHALL replace the pending value (not queue another write).
- A `beforeunload` event SHALL flush any pending write synchronously, so closing the tab does not lose the last in-flight second of progress.
- A `visibilitychange` event that transitions the document to `hidden` SHALL also flush any pending write, for the same reason on mobile / tab-switch.

The debounce is implemented as a wrapper around the default `localStorage` (`createDebouncedStringStorage(localStorage, 1000)`) and passed to zustand's `persist` middleware as the `storage` field on the timer's `persist` call-site options object. The rehydrate wall-clock-correction callback (which advances `elapsed` by `now - startedAt` and resets `startedAt` to `now` when `isRunning` is `true` on rehydrate) is unchanged and continues to live in the timer store, passed as the `afterValidate` field to `createValidatedRehydrate`.

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

### Requirement: User play/pause gesture produces a click sound

The system SHALL play a short click sound when the user toggles the timer between paused and running via either the play button in the timer bar or the spacebar shortcut. The click for the paused-or-idle → running transition SHALL ascend in pitch, and the click for the running → paused transition SHALL descend in pitch. The system SHALL NOT play a click sound on system-initiated state changes such as auto-rolling into the next phase after an interval ends, switching the focused task while the timer is running, or any other state change that is not triggered by a direct user play/pause gesture. The click volume and the click waveform/frequencies SHALL be hardcoded and SHALL NOT be user-configurable.

#### Scenario: Click play from idle

- **WHEN** the user clicks the play button while the timer is at full duration and stopped
- **THEN** a short ascending click sound plays
- **AND** the timer transitions to running

#### Scenario: Spacebar resume

- **WHEN** the user presses the spacebar while the timer is paused with elapsed time greater than zero
- **THEN** a short ascending click sound plays
- **AND** the timer transitions to running

#### Scenario: Click pause

- **WHEN** the user clicks the play button while the timer is running
- **THEN** a short descending click sound plays
- **AND** the timer transitions to paused

#### Scenario: Spacebar pause

- **WHEN** the user presses the spacebar while the timer is running
- **THEN** a short descending click sound plays
- **AND** the timer transitions to paused

#### Scenario: Auto-roll does not click

- **WHEN** an interval ends and the next phase auto-starts (autoStart is enabled for that transition)
- **THEN** no click sound plays
- **AND** only the end-of-interval alarm sound plays

#### Scenario: Skip does not click

- **WHEN** the user clicks the skip button
- **THEN** no click sound plays
- **AND** the current interval ends and the next phase begins stopped

#### Scenario: Switching focus while running does not click

- **WHEN** the user clicks a different task to focus while the timer is running
- **THEN** no click sound plays
- **AND** `focusedTaskId` is updated to the new task
- **AND** the timer's `phase`, `elapsed`, `startedAt`, and `isRunning` are unchanged

#### Scenario: Switching focus mid-break preserves the break

- **WHEN** the user clicks a different task to focus while the timer is running on a short or long break
- **THEN** `focusedTaskId` is updated to the new task
- **AND** `phase` remains on the break
- **AND** `isRunning` remains `true`
- **AND** `elapsed` is unchanged
- **AND** when the break's `remainingMs` reaches zero, `advancePhase` runs normally and `sessionPomoCount` advances as it would have without the switch

#### Scenario: Click is not user-configurable

- **WHEN** the user inspects the timer settings panel
- **THEN** there is no toggle, volume, sound picker, or other control for the click sound
- **AND** no `daybox-timer` localStorage key changes when the user toggles play/pause

