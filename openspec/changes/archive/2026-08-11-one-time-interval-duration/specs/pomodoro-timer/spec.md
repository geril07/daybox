## ADDED Requirements

### Requirement: Current interval can use a one-shot duration override

The system SHALL support an optional per-interval duration override (`intervalDurationMin`) on timer runtime state. When the override is a positive integer number of minutes, the current interval's full duration SHALL be that value. When the override is `null`, the interval duration SHALL be the configured default for the current phase (`focusDuration`, `shortBreakDuration`, or `longBreakDuration`). The override SHALL NOT modify timer settings defaults. Remaining time and progress SHALL be computed from the resolved duration and `elapsed` exactly as today (`remaining = max(0, durationMs - elapsed)`).

#### Scenario: Default duration when no override

- **WHEN** `intervalDurationMin` is `null` and the phase is focus with `focusDuration` 25
- **THEN** the timer treats the interval as 25 minutes long

#### Scenario: Override replaces phase default for this interval

- **WHEN** the phase is focus, `focusDuration` is 25, and `intervalDurationMin` is 15
- **THEN** the timer treats the interval as 15 minutes long
- **AND** `settings.focusDuration` remains 25

#### Scenario: Override applies to break phases

- **WHEN** the phase is short break, `shortBreakDuration` is 5, and `intervalDurationMin` is 10
- **THEN** the timer treats the interval as 10 minutes long
- **AND** `settings.shortBreakDuration` remains 5

#### Scenario: Completing a custom-length focus still counts a pomo

- **WHEN** a focus interval with a non-null override finishes while a task is focused
- **THEN** the task's `pomoCompleted` increases by 1
- **AND** `sessionPomoCount` increments per existing phase-advance rules

### Requirement: User can set the one-shot duration from the timer clock

The system SHALL let the user open a duration adjuster by activating the timer clock digits when the timer is not running. The adjuster SHALL use the shared `NumberInput` control, SHALL label the action as applying to the current interval only, and SHALL show the phase default for reference. When the override is active, the adjuster SHALL offer a clickable Reset control that clears the override. Activating the clock while the timer is running SHALL NOT open the adjuster. Applying a value equal to the phase default SHALL clear the override (`null`) rather than storing a redundant number.

#### Scenario: Open adjuster when idle

- **WHEN** the timer is not running and the user activates the clock digits
- **THEN** the duration adjuster opens

#### Scenario: Open adjuster when paused

- **WHEN** the timer is paused (`isRunning` false, `elapsed` may be greater than 0) and the user activates the clock digits
- **THEN** the duration adjuster opens

#### Scenario: Running timer does not open adjuster

- **WHEN** the timer is running and the user activates the clock digits
- **THEN** the duration adjuster does not open

#### Scenario: NumberInput sets override

- **WHEN** the adjuster is open on a focus interval whose default is 25 and the user sets the NumberInput to 45
- **THEN** `intervalDurationMin` becomes 45
- **AND** the displayed full duration reflects 45 minutes

#### Scenario: Choosing the default clears override

- **WHEN** `intervalDurationMin` is 45, focus default is 25, and the user sets the NumberInput to 25
- **THEN** `intervalDurationMin` becomes `null`

#### Scenario: Reset clears override when custom

- **WHEN** `intervalDurationMin` is non-null and the user activates Reset in the adjuster
- **THEN** `intervalDurationMin` becomes `null`

#### Scenario: Reset is hidden when using default

- **WHEN** `intervalDurationMin` is `null` and the adjuster is open
- **THEN** the Reset control is not shown

#### Scenario: Reject duration that would already be elapsed

- **WHEN** the timer is paused with `elapsed` greater than or equal to N minutes
- **AND** the user attempts to set the interval duration to N minutes or fewer
- **THEN** the override is not applied
- **AND** the interval does not complete as a side effect

### Requirement: One-shot duration override clears with the interval

The system SHALL set `intervalDurationMin` to `null` when the current interval ends or is replaced: on `advancePhase` (natural completion or skip), on `setPhase`, and on `resetSession`. Restarting the current interval clock (`reset`) SHALL preserve the override. The override SHALL persist across page reload while it remains set (it is part of `daybox-timer` runtime state).

#### Scenario: Clear on phase advance

- **WHEN** `intervalDurationMin` is 15 and the interval completes or is skipped
- **THEN** after advance, `intervalDurationMin` is `null`
- **AND** the next phase uses its settings default

#### Scenario: Clear on manual phase switch

- **WHEN** `intervalDurationMin` is 40 and the user switches phase via the phase chip
- **THEN** `intervalDurationMin` is `null`

#### Scenario: Clear on session reset

- **WHEN** `intervalDurationMin` is 40 and the user resets the session
- **THEN** `intervalDurationMin` is `null`

#### Scenario: Keep on interval restart

- **WHEN** `intervalDurationMin` is 40 and the user restarts the current interval
- **THEN** `intervalDurationMin` remains 40
- **AND** elapsed returns to 0 and the clock shows the full overridden duration

#### Scenario: Override survives reload

- **WHEN** `intervalDurationMin` is 40 and the user reloads the page before the interval ends or is cleared
- **THEN** `intervalDurationMin` is still 40

### Requirement: Custom duration is visible on the clock

When `intervalDurationMin` is non-null, the system SHALL visually distinguish the clock (or an adjacent cue) from the default-duration presentation so the user can tell the interval is customized. When the override is `null`, the clock SHALL use the normal presentation.

#### Scenario: Cue when override active

- **WHEN** `intervalDurationMin` is non-null
- **THEN** the clock presents a custom-duration visual cue

#### Scenario: No cue when using default

- **WHEN** `intervalDurationMin` is `null`
- **THEN** the clock uses the normal default presentation without the custom cue
