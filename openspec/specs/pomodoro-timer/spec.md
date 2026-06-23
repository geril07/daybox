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

The system SHALL increment a task's completed-pomodoro count when a focus interval finishes and a task is bound. The increment happens unconditionally — it does NOT depend on, and is NOT capped by, the task's `pomoEstimate`.

#### Scenario: Increment on focus complete

- **WHEN** a focus interval finishes while a task is focused
- **THEN** the task's pomoCompleted count increases by 1

#### Scenario: Increment is not capped by the task's estimate

- **WHEN** a focus interval finishes while a focused task has `pomoEstimate = 0` and `pomoCompleted = 0`
- **THEN** the task's `pomoCompleted` becomes `1`
- **AND** the task's `pomoEstimate` remains `0`

#### Scenario: Increment past the task's estimate

- **WHEN** a focus interval finishes while a focused task has `pomoEstimate = 3` and `pomoCompleted = 3`
- **THEN** the task's `pomoCompleted` becomes `4`
- **AND** the task's `pomoEstimate` remains `3`

#### Scenario: Skip during focus also increments

- **WHEN** the user clicks skip during a focus interval while a task is focused
- **THEN** the task's pomoCompleted count increases by 1
- **AND** `pomoEstimate` is not modified

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

The system SHALL send a browser notification when an interval completes, subject to the rules defined in the four requirements "User can toggle browser notifications", "Permission is requested only on explicit user action", "Settings panel reflects live permission state", and "Notification fires only when user is away". When none of those gating rules permit the OS-level notification, the system SHALL still play the configured alarm sound. When the user clicks the notification, the system SHALL call `window.focus()` on the DayBox tab.

#### Scenario: Notification on interval end (happy path)

- **WHEN** an interval ends, `notificationsEnabled` is true, the browser permission is `granted`, and the document is hidden
- **THEN** a notification is shown with the interval name
- **AND** the configured alarm sound also plays

#### Scenario: Sound plays even when notification is suppressed

- **WHEN** an interval ends but one of the gating rules prevents the OS-level notification (toggle off, permission not granted, or document visible)
- **THEN** the configured alarm sound still plays

### Requirement: User can toggle browser notifications

The system SHALL let the user enable or disable browser notifications on interval end via a `Switch` in `TimerSettingsPanel`. The value SHALL default to `true` and SHALL be persisted under `daybox-timer` as part of `TimerSettings`. The alarm sound is not affected by this toggle.

#### Scenario: Toggle defaults to enabled

- **WHEN** the user opens `TimerSettingsPanel` to the Notifications group for the first time
- **THEN** the Switch is in the on position

#### Scenario: Toggling off silences the OS notification

- **WHEN** the user turns the Switch off
- **THEN** no browser notification is sent on subsequent interval completions
- **AND** the alarm sound still plays

#### Scenario: Toggle persists across reload

- **WHEN** the user turns the Switch off and reloads the page
- **THEN** the Switch is still in the off position

### Requirement: Permission is requested only on explicit user action

The system SHALL request browser notification permission ONLY when the user clicks the "Enable notifications" button in `TimerSettingsPanel`. The system SHALL NOT request permission on page load, on first timer start, on first interval completion, or implicitly anywhere else. A previously-rejected permission prompt (state `denied`) SHALL be respected: the system SHALL NOT call `Notification.requestPermission()` again from JS — the user must change the permission via the browser's site settings UI.

#### Scenario: Page load does not prompt

- **WHEN** the user loads the app for the first time
- **THEN** no browser permission prompt appears

#### Scenario: First timer start does not prompt

- **WHEN** the user clicks the timer play button for the first time
- **THEN** no browser permission prompt appears

#### Scenario: Clicking the enable button prompts

- **WHEN** the user clicks the "Enable notifications" button in `TimerSettingsPanel` and the current permission is `default`
- **THEN** `Notification.requestPermission()` is called
- **AND** if the user grants, subsequent interval completions fire the OS notification per the visibility and toggle rules

### Requirement: Settings panel reflects live permission state

`TimerSettingsPanel` SHALL display a button whose label, enabled state, and click behavior depend on the current `Notification.permission` value:

- `default` → label "Enable notifications", enabled, click invokes `requestNotificationPermission()`.
- `granted` → label "Disable notifications", enabled, click sets `notificationsEnabled` to `false`.
- `denied` → label "Blocked in browser settings", disabled, no click action; a hint below the button tells the user to use the browser's site settings.

The panel SHALL re-read `Notification.permission` whenever the document transitions to `visible` (a `visibilitychange` listener) so the button reflects the latest browser state when the user returns to the tab after changing it via the browser UI.

#### Scenario: Button label matches permission state

- **WHEN** the panel renders and `Notification.permission` is `default`
- **THEN** the button shows "Enable notifications"
- **WHEN** the permission is `granted`
- **THEN** the button shows "Disable notifications"
- **WHEN** the permission is `denied`
- **THEN** the button shows "Blocked in browser settings" and is disabled

#### Scenario: Permission change in browser UI is reflected on return

- **WHEN** the user changes the notification permission via the browser's site settings and then returns to the DayBox tab
- **THEN** the panel re-reads the permission and updates the button label and state accordingly

### Requirement: Notification fires only when user is away

The system SHALL fire a browser notification on interval end ONLY when ALL of the following are true:

- `settings.notificationsEnabled` is `true`.
- `Notification.permission === 'granted'`.
- `document.visibilityState !== 'visible'`.

The end-of-interval alarm sound SHALL play regardless of any of the above.

#### Scenario: Notification suppressed when tab is visible

- **WHEN** an interval ends and the DayBox tab is the currently visible tab
- **THEN** no browser notification is sent
- **AND** the alarm sound still plays

#### Scenario: Notification fires when tab is hidden

- **WHEN** an interval ends and the user has switched to another tab or minimized the browser
- **THEN** a browser notification is sent
- **AND** the alarm sound still plays

#### Scenario: Notification suppressed when toggle is off

- **WHEN** `settings.notificationsEnabled` is `false` and an interval ends
- **THEN** no browser notification is sent regardless of visibility or permission
- **AND** the alarm sound still plays

### Requirement: Notification click focuses the tab

When the user clicks a DayBox interval-end notification, the system SHALL invoke `window.focus()` on the notification's `onclick` handler so the browser brings the DayBox tab to the foreground.

#### Scenario: Clicking the notification focuses the tab

- **WHEN** the user clicks a DayBox interval-end notification
- **THEN** `window.focus()` is called on the DayBox window

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

### Requirement: User can clear the focused task from the timer bar

The timer bar's "Working on…" row SHALL render an inline clear affordance (an ✕ icon) immediately after the task title whenever `useTimerStore.focusedTaskId` is non-null. The affordance SHALL be visible regardless of whether the focused task is still resolvable from the tasks store — it is the user's way out of both an off-screen focus and a stale focus. Activating the affordance SHALL call `useTimerStore.setFocusedTaskId(null)` and SHALL NOT mutate `phase`, `elapsed`, `startedAt`, `isRunning`, or `sessionPomoCount`. The affordance SHALL NOT be rendered when `focusedTaskId` is `null`.

The clear affordance is a peer of the existing `TaskRow` focus toggle: both paths converge on `setFocusedTaskId(null)`. The `focusTask(id)` toggle semantics on `TaskRow` SHALL NOT change.

#### Scenario: Clear button is hidden when no task is focused

- **WHEN** `useTimerStore.focusedTaskId` is `null`
- **THEN** the "Working on…" row shows "No task focused" and renders no clear affordance

#### Scenario: Clear button is visible when a task is focused

- **WHEN** `useTimerStore.focusedTaskId` is set to a task id and that task exists in `useTaskStore.tasks`
- **THEN** the "Working on…" row shows the task's title and renders a clear affordance inline after the title

#### Scenario: Clear button is visible when the focused task is stale

- **WHEN** `useTimerStore.focusedTaskId` is set to a task id that no task in `useTaskStore.tasks` has
- **THEN** the "Working on…" row renders a clear affordance inline after the title
- **AND** activating it sets `focusedTaskId` to `null`

#### Scenario: Activating the clear button sets focusedTaskId to null

- **WHEN** the user activates the clear affordance and `focusedTaskId` was `'t-1'`
- **THEN** `useTimerStore.focusedTaskId` becomes `null`

#### Scenario: Clearing focus does not disturb timer state

- **WHEN** the timer is running with `phase: 'focus'`, `elapsed: 60000`, `isRunning: true`, `startedAt` set, `sessionPomoCount: 2`, and `focusedTaskId: 't-1'`, and the user activates the clear affordance
- **THEN** `focusedTaskId` becomes `null`
- **AND** `phase` remains `'focus'`
- **AND** `elapsed` remains `60000`
- **AND** `isRunning` remains `true`
- **AND** `startedAt` is unchanged
- **AND** `sessionPomoCount` remains `2`
