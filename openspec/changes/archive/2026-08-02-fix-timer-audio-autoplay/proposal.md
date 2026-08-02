## Why

DayBox resumes a running Pomodoro after a reload, including when the page has
not received a user gesture. When an interval then completes, `TimerBar` calls
`playAlarm`, while `src/modules/timer/alarm.ts` creates or uses a suspended
`AudioContext`, calls `resume()` without awaiting it, and schedules oscillator
nodes immediately.

Depending on the browser, those nodes may never play, or may become audible
later when the user first interacts with the page. With auto-start enabled,
multiple phase-end alarms can accumulate in the suspended context. A later
play/pause click can therefore release stale alarms alongside its intentional
click sound. The timer transition and browser notification are correct; the
problem is that audio scheduling is being treated as successful before the
browser has allowed playback.

## What Changes

- Make the timer audio module explicitly track whether its `AudioContext` is
  ready to play. An interval-end alarm SHALL NOT create/schedule audio while
  the context is locked or suspended.
- Unlock audio from the first trusted page interaction (pointer or keyboard)
  without producing sound. This means ordinary use of the app enables future
  alarms, while browsers still retain control over autoplay.
- Make the direct play/pause click path await a successful context resume before
  scheduling its click. The first play/pause gesture must not release any stale
  interval-end alarms.
- Treat an interval-end alarm that cannot play at the interval boundary as a
  consumed, best-effort event. It SHALL be dropped rather than queued for a
  later interaction.
- Keep phase advancement, focused-task pomodoro completion, and eligible OS
  notifications independent of audio success.
- Add suspended, rejected, and delayed-resume audio tests plus a `TimerBar`
  regression test covering a running timer that crosses an interval boundary
  before audio is unlocked.
- Update the `pomodoro-timer` capability so its sound and play/pause-click
  requirements describe browser autoplay constraints and explicitly prohibit
  replaying stale alarms after unlock.

## Capabilities

### Modified Capabilities

- `pomodoro-timer`: make interval-end sound best-effort when browser autoplay is
  blocked, define first-interaction audio unlocking, and prevent delayed alarm
  replay while preserving configured sound behavior after unlock.

## Impact

- `src/modules/timer/alarm.ts` — separate user-gesture unlocking from
  interval-end alarm scheduling; await and verify `AudioContext.resume()` before
  scheduling gesture-triggered clicks; avoid scheduling while suspended.
- `src/modules/timer/components/TimerBar.tsx` — keep interval completion
  behavior independent from whether audio was accepted by the browser and wire
  the revised audio contract if it returns readiness/success.
- `src/app/App.tsx` or the timer's existing user-interaction boundary — register
  the one-time trusted interaction used to unlock audio without creating a
  cross-feature dependency.
- `src/test-setup.ts` and timer tests — model suspended and rejected contexts;
  verify that stale alarms are not released by a later gesture and that future
  alarms still honor sound, volume, and repeat settings after unlock.
- `openspec/specs/pomodoro-timer/spec.md` — add the autoplay-aware behavior and
  scenarios for locked audio, successful unlock, and dropped missed alarms.

No persisted state, timer schema, phase-transition logic, task data, or browser
notification permission flow changes are expected.

## Decisions

### First page interaction unlocks audio

Audio is unlocked silently from the first trusted pointer or keyboard
interaction rather than requiring users to find a dedicated sound setting. The
unlock is not persisted as a preference; it is a property of the current
browser document and must be established again after reload when the browser
requires it. An explicit sound-enable control remains unnecessary for this
change.

### Missed interval-end alarms are dropped

An alarm identifies the interval that just ended and is useful at that moment;
it is not a durable queue. Replaying it after the user returns would announce
an old phase and can produce a confusing burst of sound. Browser notifications
remain the away-from-tab channel when permission and visibility rules allow
them.

### Existing sound choices remain unchanged

The selected alarm waveform, volume, and repeat count continue to apply once
audio is running. The play/pause click remains hardcoded and user-initiated.
This change only fixes readiness and delivery semantics; it does not add new
sound settings or replace Web Audio with media elements.

## Out of scope

- Catching up multiple Pomodoro phases after the page was closed or inactive
  for longer than one interval. Rehydration currently advances one phase when
  the mounted timer observes an expired interval; that is a separate timer
  state-model decision.
- Persisting an audio-unlocked flag across reloads.
- Adding a sound permission prompt or a new sound settings UI.
- Changing browser notification permissions, visibility gating, notification
  copy, or notification persistence behavior.
- Changing the intentional three-tone/repeat behavior of a configured alarm.
