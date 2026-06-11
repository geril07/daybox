## MODIFIED Requirements

### Requirement: Browser notification on interval end

The system SHALL send a browser notification when an interval completes, subject to the rules defined in the four requirements "User can toggle browser notifications", "Permission is requested only on explicit user action", "Settings panel reflects live permission state", and "Notification fires only when user is away". When none of those gating rules permit the OS-level notification, the system SHALL still play the configured alarm sound. When the user clicks the notification, the system SHALL call `window.focus()` on the DayBox tab.

#### Scenario: Notification on interval end (happy path)

- **WHEN** an interval ends, `notificationsEnabled` is true, the browser permission is `granted`, and the document is hidden
- **THEN** a notification is shown with the interval name
- **AND** the configured alarm sound also plays

#### Scenario: Sound plays even when notification is suppressed

- **WHEN** an interval ends but one of the gating rules prevents the OS-level notification (toggle off, permission not granted, or document visible)
- **THEN** the configured alarm sound still plays

## ADDED Requirements

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
