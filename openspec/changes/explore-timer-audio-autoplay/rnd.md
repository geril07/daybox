# RND — Timer audio under browser autoplay restrictions

> **Status: exploration complete; proposal drafted.**
> This document records the current behavior and the design space. The concrete
> direction is captured in [the follow-up proposal](../fix-timer-audio-autoplay/proposal.md);
> this document does not change the timer implementation or canonical specs.

## 1. Problem

DayBox resumes a running timer after a reload. If the interval ends before the
user has interacted with the new document, the timer still advances and the
end-of-interval effect still calls `playAlarm`. Browsers may keep Web Audio
suspended until a user gesture. If the alarm is scheduled into that suspended
context, it can become audible only when a later gesture resumes the context.

That can produce either:

- no alarm at all, if the browser refuses the resume; or
- a delayed alarm after the user interacts, possibly alongside the intentional
  play/pause click; or
- several old alarms at once if auto-start carries the timer through multiple
  phases while the context remains suspended.

The last two cases explain the suspected "misplayed" or redundant audio. The
three repeats configured for one alarm are intentional; they are not the same
as replaying alarms from already-completed phases.

Autoplay behavior is browser- and permission-policy-dependent, so the app must
not assume that an alarm scheduled outside a user gesture will eventually play.
Chrome's Web Audio guidance recommends resuming an `AudioContext` from a user
interaction and checking its `state`; `AudioContext.resume()` is asynchronous.
See [Chrome's autoplay guidance](https://developer.chrome.com/blog/autoplay) and
[MDN's `resume()` reference](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume).

## 2. Current flow

Relevant implementation:

- `src/modules/timer/store.ts:196-202` adds wall-clock time to `elapsed` when a
  persisted running timer rehydrates. It does not itself advance phases or
  play sound.
- `src/modules/timer/components/TimerBar.tsx:87-121` detects
  `remainingMs <= 0` while `isRunning`, marks the local alarm ref as played,
  calls `playAlarm`, sends an optional browser notification, and advances one
  phase.
- `src/modules/timer/alarm.ts:7-15` lazily constructs one shared
  `AudioContext`. If it is suspended, it calls `resume()` without awaiting or
  checking the returned promise.
- `src/modules/timer/alarm.ts:17-38` and `:40-60` immediately create and
  schedule oscillator nodes after `getAudioContext()` returns, regardless of
  whether the context is actually running.
- `src/modules/timer/alarm.ts:94-101` uses the same context for the direct
  play/pause click. That is currently the main code path that both resumes the
  context in response to a user gesture and schedules audio in that gesture.

The likely reload sequence is:

```text
rehydrate running timer
  -> wall-clock correction crosses the interval boundary
  -> TimerBar effect calls playAlarm
  -> AudioContext is created suspended
  -> resume() is started but ignored
  -> alarm oscillators are scheduled anyway
  -> advancePhase() runs
  -> auto-start may repeat the same process for later phases

later play/pause gesture
  -> getAudioContext() tries to resume the same context
  -> play/pause click is scheduled
  -> any still-pending alarm nodes may become audible too
```

`alarmPlayedRef` prevents repeated effect work for the same mounted phase, but
it means "nodes were scheduled", not "sound was delivered". It is not persisted
across reloads. It does not protect against multiple phase alarms being queued
in one suspended context.

There is no alarm/audio test coverage. The test `AudioContext` in
`src/test-setup.ts` always reports `state = 'running'` and has a no-op
`resume()`, so this failure mode is invisible to the current test suite.

## 3. What is and is not a duplicate

### Intentional

- `alarmRepeat` repeats the tones within one interval-end alarm.
- A user play/pause gesture produces a separate short click.
- Browser notification and in-app alarm are separate channels.

### Suspect

- An interval-end alarm scheduled while the context is suspended becomes
  audible during a later gesture.
- Multiple interval-end alarms accumulate while auto-start advances phases in a
  document that has never unlocked audio.
- A delayed alarm can overlap the first play/pause click and sound like a
  duplicate.

There is no obvious unconditional duplicate call in the mounted `TimerBar`:
`alarmPlayedRef` is set before `playAlarm`, and it is reset when `phase` or
`startedAt` changes. The exact browser behavior of already-scheduled nodes in a
suspended context still needs a manual check in the supported browsers.

## 4. Design decisions to make

### A. Missed alarms must be dropped or replayed

Recommended default: **drop an alarm that cannot play at its interval end**.
An interval-end sound is an immediate event, not a durable queue. Replaying it
on the next interaction is surprising and can describe a phase that is no
longer current. The browser notification is already the durable/away-from-tab
channel when permission is granted.

Alternative: keep only the latest missed alarm and explicitly announce it after
unlock. This preserves a stronger "never miss" promise, but makes delayed
sound intentional and needs visible UX to explain why an old phase is playing.
It should not happen accidentally through Web Audio scheduling.

### B. What unlocks audio

Two reasonable product choices:

1. **Any first trusted page interaction.** Register a one-time pointer/keyboard
   interaction hook that silently creates/resumes the context. This lets a user
   click a task or open settings and have future alarms work, without making
   the user find a sound-specific control.
2. **An explicit timer/sound interaction.** Unlock from the play/pause control or
   an "Enable sound" control. This is more explicit but means ordinary use of
   the page may not enable future alarms.

The existing play/pause click should remain user-initiated audio. If it is the
first gesture, it must await a successful resume before scheduling the click;
otherwise the click itself can be lost or can share a resume with stale alarm
nodes.

### C. How to represent readiness

The audio module should distinguish these states:

- no context created;
- context exists but is suspended/blocked;
- context is running and can accept new alarm scheduling;
- context is closed or resume failed.

`playAlarm` should not create a context or leave an unresolved resume that can
later release old nodes. It should be best-effort and return a success/failure
signal (or use an equivalent internal contract). A user-gesture unlock path may
await `resume()` and schedule the current click only after the context is
running. A failed or locked interval-end alarm is consumed once and is never
retried as an old audio event.

If a previously unlocked context is later suspended for lifecycle reasons, the
module may attempt a non-gesture resume, but it still must not schedule the
current alarm until the promise succeeds; a failed attempt must not queue sound
for a future gesture.

## 5. Preferred exploration direction

Before committing to a proposal, manually verify the behavior in at least one
Chromium browser with this sequence:

1. Open a fresh/private DayBox document with no prior interaction.
2. Use short durations and auto-start to cross one and then several phase
   boundaries.
3. Reload while running and do not interact until after a boundary.
4. Interact with the page using (a) play/pause and (b) a non-timer click.
5. Record whether the old alarm, the click, both, or neither are audible.
6. Repeat with the tab hidden and with browser notifications granted.

The likely implementation direction is a small audio-lifecycle change inside
the timer module:

- do not schedule alarm oscillators while the context is not running;
- unlock/resume only from a trusted user gesture (possibly the first page
  interaction, depending on the product choice above);
- await resume before scheduling gesture-triggered click audio;
- do not replay alarms missed while audio was locked;
- keep the phase transition, task completion update, and browser notification
  independent from sound success;
- add suspended/rejected-context tests and a TimerBar regression test for reload
  at interval end.

This keeps the state model intact and fixes the root cause rather than adding a
second alarm guard in `TimerBar`.

## 6. Expected spec delta if this becomes a change

The current `pomodoro-timer` requirement says an alarm SHALL play whenever an
interval ends. That needs an explicit browser-autoplay qualification, for
example:

- when audio is unlocked and the browser permits playback, the configured
  alarm plays with its selected volume and repeat count;
- when audio is locked or resume fails, the timer still advances and eligible
  browser notifications still fire, but no alarm is queued for later playback;
- after a successful user gesture unlock, future interval completions can play;
- unlocking does not replay alarms from completed intervals.

The existing play/pause click requirement should also state that the first
user-gesture click unlocks audio and that it does not release stale interval-end
alarms.

The product choice is now captured in
[`fix-timer-audio-autoplay/proposal.md`](../fix-timer-audio-autoplay/proposal.md).
A delta spec, detailed design, and implementation tasks remain follow-up
artifacts for the proposal stage.

## 7. Open questions

1. Should any page interaction unlock sound, or should the user explicitly
   press a timer/sound control?
2. Is dropping an alarm before first interaction acceptable when browser
   notifications are disabled or unavailable?
3. Which browsers are in scope for the manual verification?
4. Should a visible UI indicator say "sound unavailable until you interact"
   or "sound enabled"?
5. Is catching up one phase after a long reload downtime in scope? The current
   rehydration path can have `elapsed` beyond one duration but `TimerBar` only
   calls `advancePhase()` once; this is adjacent to, but separate from, the
   delayed-audio bug.

## Fragility / uncertainty

The code-level cause is clear: scheduling proceeds without confirming a
running context, and `resume()` is ignored. The exact number and timing of
sounds released after a later gesture is browser-dependent and must be
verified manually; this document intentionally does not treat that behavior as
identical across engines.
