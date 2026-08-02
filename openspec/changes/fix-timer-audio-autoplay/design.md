## Context

The timer's audio module currently creates a shared `AudioContext` on the first
interval-end alarm or play/pause click. When the first call happens outside a
trusted user gesture, browsers may leave the context suspended. The module then
schedules oscillator nodes without waiting for `resume()`, so those nodes can
be released by a later gesture. `TimerBar` treats scheduling as delivery and
advances the phase independently.

The fix keeps the timer state model and Web Audio sound definitions, but makes
context readiness an explicit boundary between user-gesture unlocking and
interval-end alarm delivery.

## Decisions

### Create/resume audio only from user interaction

`unlockAudio()` owns lazy context creation and calls `AudioContext.resume()`.
The first trusted `pointerdown` or `keydown` observed by `App` calls it
silently. The play/pause click helpers also call it, so the timer audio API is
safe when used without the full app shell (for example, in a focused component
or a future surface).

Unlocking is idempotent and shares an in-flight resume promise. A successful
call records that this document has unlocked audio; a rejected or still
suspended resume resolves to `false` and can be retried on a later gesture.
Unlock state is in memory only.

### Never queue a locked interval-end alarm

`playAlarm()` does not create a context and does not call `resume()`. It first
checks that a context was created by a user interaction, that the document's
audio has unlocked, and that the context is currently `running`. If any check
fails, it returns `false` and creates no oscillator or gain nodes. `TimerBar`
continues its completion path regardless of that return value, so the missed
alarm is consumed rather than retried.

A context that was previously unlocked may later become suspended for a
lifecycle reason. The next user interaction can call `unlockAudio()` again; an
interval-end alarm observed while it is suspended is still dropped. No
non-gesture resume is started by `playAlarm`, which prevents a pending resume
from releasing an old alarm later.

### Await readiness for gesture-triggered clicks

`playStartClick()` and `playPauseClick()` start an asynchronous helper that
awaits `unlockAudio()`, rechecks that the context is running, and only then
creates the sweep nodes. The public helpers retain a `void` return shape so
existing click and keyboard handlers do not need to await them. The timer state
transition remains immediate and is not coupled to audio success.

### Unlock from the app shell

`App` installs `pointerdown` and `keydown` listeners in an effect and removes
them on unmount. The listeners may remain installed after a successful unlock;
`unlockAudio()` is a cheap resolved promise in the running state. Keeping the
listeners retryable handles a browser that rejects the first resume attempt.
The listener produces no sound and does not request any browser permission.

### Keep notification and timer completion paths independent

The existing `TimerBar` completion effect keeps its current ordering and
behavior: mark the mounted interval event handled, attempt the sound, send an
eligible notification, update a focused task, and call `advancePhase`. Sound
failure cannot prevent phase advancement or task/notification behavior.

## Testing strategy

- Add an audio test double that records oscillator creation and can start
  suspended, resolve resume later, or reject resume.
- Test that a locked `playAlarm()` does not call `resume()` or create nodes.
- Test that a successful user unlock allows future alarms and preserves the
  configured repeat/frequency scheduling.
- Test that a rejected/delayed unlock does not later play an old alarm when the
  resume eventually resolves; only a click requested by the gesture may be
  scheduled after a successful unlock.
- Test `TimerBar` with an expired running interval and a suspended context:
  phase/task/notification behavior still completes, and a later unlock does
  not create the consumed alarm.
- Test the app shell's interaction listeners through the audio unlock mock if
  needed; the audio module tests cover the state machine directly.

## Files

- `src/modules/timer/alarm.ts` — context lifecycle, readiness checks, and
  gesture-click scheduling.
- `src/app/App.tsx` — first-interaction unlock listeners.
- `src/test-setup.ts` — observable AudioContext test double.
- `src/modules/timer/alarm.test.ts` — unit coverage for the audio lifecycle.
- `src/modules/timer/components/TimerBar.test.tsx` — interval-end regression.
- `openspec/changes/fix-timer-audio-autoplay/specs/pomodoro-timer/spec.md` —
  delta requirements and scenarios.
- `openspec/specs/pomodoro-timer/spec.md` — synchronized canonical behavior.
