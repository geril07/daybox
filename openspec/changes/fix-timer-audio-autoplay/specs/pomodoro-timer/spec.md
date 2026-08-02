## MODIFIED Requirements

### Requirement: Sound notification on interval end

The system SHALL attempt to play the configured alarm sound when an interval
completes, using the selected volume and repeat count. The alarm SHALL play
only when the document's timer audio context has been unlocked and is running.
If browser autoplay policy blocks audio, the interval-end event SHALL be
consumed without queuing the alarm for a later interaction.

#### Scenario: Sound plays with configured settings after unlock

- **WHEN** an interval ends, `alarmVolume > 0`, and timer audio is unlocked with
  a running context
- **THEN** the selected `alarmSound` plays at the configured volume, repeating
  `alarmRepeat` times

#### Scenario: Locked interval-end sound is dropped

- **WHEN** an interval ends before the user has unlocked timer audio
- **THEN** no oscillator or alarm sound is scheduled
- **AND** the interval still advances normally
- **AND** no later user interaction replays that alarm

### Requirement: Browser notification on interval end

The system SHALL send a browser notification when an interval completes,
subject to the rules defined in the four requirements "User can toggle browser
notifications", "Permission is requested only on explicit user action",
"Settings panel reflects live permission state", and "Notification fires only
when user is away". Browser notification delivery SHALL be independent of timer
audio readiness. When the user clicks the notification, the system SHALL call
`window.focus()` on the DayBox tab.

#### Scenario: Notification on interval end (happy path)

- **WHEN** an interval ends, `notificationsEnabled` is true, the browser
  permission is `granted`, and the document is hidden
- **THEN** a notification is shown with the interval name
- **AND** the configured alarm sound also plays when timer audio is unlocked
  and running

#### Scenario: Sound plays even when notification is suppressed

- **WHEN** an interval ends but one of the notification gating rules prevents
  the OS-level notification (toggle off, permission not granted, or document
  visible)
- **THEN** the configured alarm sound plays when timer audio is unlocked and
  running
- **AND** no sound is queued if timer audio is locked

### Requirement: User can toggle browser notifications

The system SHALL let the user enable or disable browser notifications on interval end via a `Switch` in `TimerSettingsPanel`. The value SHALL default to `true` and SHALL be persisted under `daybox-timer` as part of `TimerSettings`. The alarm sound is not affected by this toggle, subject to the timer audio readiness rules.

#### Scenario: Toggle defaults to enabled

- **WHEN** the user opens `TimerSettingsPanel` to the Notifications group for the first time
- **THEN** the Switch is in the on position

#### Scenario: Toggling off silences the OS notification

- **WHEN** the user turns the Switch off
- **THEN** no browser notification is sent on subsequent interval completions
- **AND** the alarm sound plays when timer audio is unlocked and running

#### Scenario: Toggle persists across reload

- **WHEN** the user turns the Switch off and reloads the page
- **THEN** the Switch is still in the off position

### Requirement: Notification fires only when user is away

The system SHALL fire a browser notification on interval end ONLY when ALL of
the following are true:

- `settings.notificationsEnabled` is `true`.
- `Notification.permission === 'granted'`.
- `document.visibilityState !== 'visible'`.

The end-of-interval alarm SHALL be attempted independently of these rules and
SHALL play only when timer audio is unlocked and running; a locked alarm SHALL
be dropped rather than replayed later.

#### Scenario: Notification suppressed when tab is visible

- **WHEN** an interval ends and the DayBox tab is the currently visible tab
- **THEN** no browser notification is sent
- **AND** the alarm plays only if timer audio is unlocked and running

#### Scenario: Notification fires when tab is hidden

- **WHEN** an interval ends and the user has switched to another tab or
  minimized the browser
- **THEN** a browser notification is sent
- **AND** the alarm plays only if timer audio is unlocked and running

#### Scenario: Notification suppressed when toggle is off

- **WHEN** `settings.notificationsEnabled` is `false` and an interval ends
- **THEN** no browser notification is sent regardless of visibility or
  permission
- **AND** the alarm plays only if timer audio is unlocked and running

### Requirement: User play/pause gesture produces a click sound

The system SHALL attempt to play a short click sound when the user toggles the
timer between paused and running via either the play button in the timer bar or
the spacebar shortcut. The click for the paused-or-idle → running transition
SHALL ascend in pitch, and the click for the running → paused transition SHALL
descend in pitch. The first trusted page interaction SHALL unlock timer audio
silently when the browser requires it. A click SHALL be scheduled only after a
successful unlock and running context; a failed unlock SHALL not delay or queue
the click. The system SHALL NOT play a click sound on system-initiated state
changes such as auto-rolling into the next phase after an interval ends,
switching the focused task while the timer is running, or any other state
change that is not triggered by a direct user play/pause gesture. The click
volume and the click waveform/frequencies SHALL be hardcoded and SHALL NOT be
user-configurable.

#### Scenario: First page interaction unlocks audio

- **WHEN** the user makes the first trusted pointer or keyboard interaction
  with the DayBox page
- **THEN** timer audio attempts to unlock without producing a sound
- **AND** a later interval-end alarm can play if the browser allows it

#### Scenario: First play gesture does not replay a stale alarm

- **WHEN** an interval ended while timer audio was locked and the user later
  clicks play or presses the spacebar
- **THEN** only the current user gesture's click may be scheduled
- **AND** the previously missed interval-end alarm is not replayed

#### Scenario: Auto-roll does not click

- **WHEN** an interval ends and the next phase auto-starts (autoStart is enabled
  for that transition)
- **THEN** no click sound plays
- **AND** only the end-of-interval alarm is attempted, if timer audio is ready

## ADDED Requirements

### Requirement: Timer audio unlock is retryable and non-persistent

Timer audio SHALL keep its unlocked state in memory for the current document
only. A failed or still-suspended `AudioContext.resume()` SHALL be handled
without an unhandled error, and a later trusted interaction MAY retry the
unlock. Unlocking SHALL NOT request notification permission, change timer
state, or persist a new timer setting.

#### Scenario: Rejected audio unlock is safe

- **WHEN** the browser rejects an audio-context resume attempt
- **THEN** no alarm or click oscillator is scheduled from that attempt
- **AND** the timer state and eligible browser notification behavior are
  unchanged
- **AND** a later trusted interaction may retry unlocking

#### Scenario: Unlock state resets on reload

- **WHEN** the user reloads the DayBox page
- **THEN** the new document does not assume that the prior document's audio
  context was unlocked
- **AND** any interval-end alarm before a new successful unlock is dropped
