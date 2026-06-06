## ADDED Requirements

### Requirement: Timer can expand to a focus mode

The system SHALL provide a focus mode that renders the current timer state at a large, ambient scale, entered from the compact timer bar and dismissible back to it. Focus mode SHALL be a presentation of the same `useTimerStore` state, not a separate timer.

#### Scenario: Enter focus mode

- **WHEN** the user activates the expand control on the compact timer bar
- **THEN** a large, ambient focus view is shown with the remaining time, phase, controls, session progress, and focused task
- **AND** the underlying timer state (phase, remaining time, running/paused) is unchanged by entering focus mode

#### Scenario: Collapse focus mode

- **WHEN** the user activates the collapse/dismiss control or presses `Escape` while in focus mode
- **THEN** the view returns to the compact timer bar
- **AND** the timer continues running uninterrupted if it was running

#### Scenario: Phase identity carries into focus mode

- **WHEN** the timer is in a break phase and the user enters focus mode
- **THEN** the focus view reflects the break phase through the ambient phase color and phase label

#### Scenario: Controls operate the shared timer

- **WHEN** the user uses play/pause, reset, or skip from within focus mode
- **THEN** the same `useTimerStore` actions run as from the compact bar
- **AND** on collapse the compact bar reflects the updated state
