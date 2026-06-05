## ADDED Requirements

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
