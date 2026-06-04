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
The system SHALL cycle through focus → short break → focus → ... → long break intervals.

#### Scenario: Focus to short break
- **WHEN** a focus interval completes
- **THEN** a short break interval begins automatically (or based on auto-start setting)

#### Scenario: Long break after interval
- **WHEN** the configured number of focus intervals completes (default 4)
- **THEN** a long break interval begins instead of a short break

### Requirement: Timer increments task pomodoros
The system SHALL increment a task's completed-pomodoro count when a focus interval finishes and a task is bound.

#### Scenario: Increment on focus complete
- **WHEN** a focus interval finishes while a task is focused
- **THEN** the task's pomoCompleted count increases by 1

### Requirement: User can start/pause/skip/reset timer
The system SHALL provide play/pause, skip, and reset controls for the timer.

#### Scenario: Start timer
- **WHEN** user clicks the play button
- **THEN** the timer starts counting down

#### Scenario: Pause timer
- **WHEN** user clicks the pause button while timer is running
- **THEN** the timer pauses and remaining time is preserved

#### Scenario: Skip interval
- **WHEN** user clicks the skip button
- **THEN** the current interval ends and the next phase begins

#### Scenario: Reset timer
- **WHEN** user clicks the reset button
- **THEN** the timer resets to the current phase's full duration

### Requirement: Session dots show progress
The system SHALL show small dots indicating completed pomodoros in the current cycle.

#### Scenario: Session progress dots
- **WHEN** user completes 2 of 4 pomodoros in a cycle
- **THEN** 2 dots are filled and 2 are dimmed

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
