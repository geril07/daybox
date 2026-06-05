## ADDED Requirements

### Requirement: Settings drawer opens from header

The system SHALL open a settings drawer when the gear icon in the header is clicked.

#### Scenario: Open settings

- **WHEN** user clicks the gear icon
- **THEN** a drawer slides in from the right with a backdrop overlay

#### Scenario: Close settings

- **WHEN** user clicks the backdrop or close button
- **THEN** the settings drawer closes

### Requirement: User can configure timer durations

The system SHALL allow users to set focus duration, short break duration, and long break duration in minutes.

#### Scenario: Change focus duration

- **WHEN** user changes the focus duration input to 30
- **THEN** the timer uses 30 minutes for focus intervals

### Requirement: User can configure long-break interval

The system SHALL allow users to set how many pomodoros between long breaks.

#### Scenario: Change long-break interval

- **WHEN** user changes the interval input to 6
- **THEN** a long break occurs every 6 pomodoros

### Requirement: User can toggle auto-start

The system SHALL allow users to toggle auto-start for breaks and pomodoros independently.

#### Scenario: Enable auto-start breaks

- **WHEN** user toggles auto-start breaks on
- **THEN** breaks start automatically after a focus interval ends

### Requirement: User can select alarm sound

The system SHALL allow users to choose from multiple alarm sounds for interval completion.

#### Scenario: Select alarm sound

- **WHEN** user selects "digital" from the alarm sound dropdown
- **THEN** the digital alarm sound plays on future interval completions

### Requirement: User can adjust alarm volume

The system SHALL allow users to control alarm volume with a slider.

#### Scenario: Adjust volume

- **WHEN** user drags the volume slider to 0.8
- **THEN** the alarm plays at 80% volume on interval completion

### Requirement: User can set alarm repeat count

The system SHALL allow users to set how many times the alarm repeats (1-5).

#### Scenario: Set repeat count

- **WHEN** user sets alarm repeat to 3
- **THEN** the alarm rings 3 times on interval completion

### Requirement: User can switch theme

The system SHALL allow users to toggle between light and dark themes.

#### Scenario: Toggle dark theme

- **WHEN** user toggles dark theme on
- **THEN** the UI switches to dark color scheme

### Requirement: User can configure first day of week

The system SHALL allow users to set the first day of the week (Sun–Sat) for the This Week view.

#### Scenario: Change first day to Monday

- **WHEN** user selects Monday as the first day of week in settings
- **THEN** the This Week view shows Mon–Sun

### Requirement: User can manage groups in settings

The system SHALL show a group management section in settings for creating, renaming, and deleting groups.

#### Scenario: See groups in settings

- **WHEN** user opens settings
- **THEN** a "Groups" section shows all groups with name, color indicator, and delete button
