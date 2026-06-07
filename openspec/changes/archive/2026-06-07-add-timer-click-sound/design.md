## Context

The Pomodoro timer has one audio primitive today: `playAlarm(sound, volume, repeat)` in `src/features/timer/alarm.ts:48`, which fires a multi-tone chord at the end of an interval. The audio module lazily initializes a shared `AudioContext` and resumes it on first use. There are no other audio exports, no audio settings beyond the alarm's sound/volume/repeat, and no audio on the in-the-moment play/pause gesture.

The user-facing gestures that toggle play/pause have two call sites:

- `src/features/timer/components/TimerBar.tsx:251` — the play button `onClick`, calling `useTimerStore.getState().togglePlayPause()`
- `src/app/App.tsx:34` — the spacebar shortcut, registered via `registerShortcuts` to call the same action

The store has three actions that change `isRunning`:

- `start()` (line 67) and `pause()` (line 73) — primitives, only called from `togglePlayPause`
- `togglePlayPause()` (line 97) — user-facing, dispatches to `start`/`pause`/`reset+start`

Two other paths flip `isRunning` _without_ going through `start`/`pause`:

- `advancePhase({ autoStart: true })` (line 109) — sets `isRunning: autoStart` directly via `set(...)`
- `focusTask(id)` (line 158) — sets `isRunning: wasRunning` directly via `set(...)`

This structural separation is the key affordance: the "user toggled play/pause" gesture and the "system auto-rolled into next phase" gesture are already distinct at the store level. Any sound wired into the user-facing path will naturally exclude the system paths.

## Goals / Non-Goals

**Goals:**

- Make pressing play/pause feel tactile. The button click is acknowledged with a short sound.
- Match the user's _current_ state: descending pitch when pausing, ascending pitch when starting/resuming — so the sound itself communicates the action.
- Cover both the click and the spacebar entry points with the same behavior, by routing both through one wrapper.
- Keep the change small: no new settings, no new persisted state, no schema change, no settings panel change.
- Pre-stub `AudioContext` in `test-setup.ts` so audio code paths do not throw in jsdom, even though no test currently exercises them.

**Non-Goals:**

- A user-facing setting for the click sound (on/off toggle, volume slider, sound picker, "play sample" button). Explicitly rejected to keep the change tiny and the feel consistent.
- A click sound on system-initiated state changes: auto-rolling into the next phase, `skip`, and switching focused task while the timer is running. The store separation handles this for free; no special-casing is needed.
- Changing the end-of-interval alarm sound or its settings.
- Haptic feedback (`navigator.vibrate`). Easy to add later by extending the wrapper, but not in scope.
- Renaming `alarm.ts` → `audio.ts` (or splitting it into `alarm.ts` + `feedback.ts`). Flagged as a follow-up.

## Decisions

### Decision 1: Wire the sound via a wrapper function, not inside the store

**Choice:** Add a `togglePlayPauseWithClick()` function that plays the click and then calls `useTimerStore.getState().togglePlayPause()`. Both `TimerBar.tsx:251` and `App.tsx:34` import and call the wrapper.

**Rationale:** Keeps the store pure (no audio module import from inside `store.ts`), keeps the call sites symmetric, and gives the future `add-timer-focus-mode` change a single import to route through. The wrapper is feature-internal (lives in `src/features/timer/alarm.ts` next to the audio primitives it uses), so the architecture spec's "intra-feature relative paths" rule is satisfied.

**Alternatives considered:**

- _Put the sound in the store action `start()`/`pause()`._ Would fire from any caller (including hypothetical future direct callers), and is one less indirection. Cost: couples the store to the audio module, and the existing test suite calls `store.start()` / `store.pause()` directly, which would now attempt to instantiate `AudioContext` in jsdom. Mitigatable with the test stub, but introduces a coupling that doesn't pay for itself yet.
- _Inline `playClick(); togglePlayPause()` at both call sites._ Two lines per call site, no wrapper. Cost: two call sites to keep in sync, no single source of truth for "the user play/pause gesture," and the future focus-mode change would need to remember to do the same thing.

### Decision 2: Read `isRunning` _before_ calling `togglePlayPause`

**Choice:** The wrapper checks `state.isRunning` first, plays the appropriate click, then calls `state.togglePlayPause()`.

**Rationale:** The sound should match the _current_ state — "you are about to pause the running timer" → descending pitch. Reading after the toggle would always play the wrong sound (the state would already have flipped).

**Alternatives considered:**

- *Branch on the *new* state after the toggle.* Wrong: `togglePlayPause` is non-trivial (it has a `reset+start` path for the fresh-start case), so reading the post-toggle state would mean inferring intent from a derived value rather than the user-visible one.
- _Have the wrapper accept the intended next state as a parameter._ Over-engineered for a hardcoded audio cue.

### Decision 3: New `playSweep` primitive for the sweeps (don't repurpose `playTone`)

**Choice:** Add a private `playSweep(fromHz, toHz, duration, volume, delay)` helper alongside the existing `playTone`. Use the Web Audio API's `linearRampToValueAtTime` for the frequency ramp and the existing exponential-decay gain envelope.

**Rationale:** The existing `playTone` takes a single fixed `frequency: number`. Adding sweep support to it would require a union type (`number | { from: number; to: number }`) or an options bag, both of which make the existing alarm-chord callsites awkward. A new helper is small, single-purpose, and keeps the existing `playAlarm` chord structure untouched.

**Alternatives considered:**

- _Stack two `playTone` calls at the start and end frequencies with no overlap._ Would create two oscillators with hard cuts, not a smooth sweep. Sounds like two clicks, not one. Rejected.
- _Modify `playTone` to take an optional `frequencyRamp`._ Backwards-compatible but adds a parameter to a function whose 5 existing call sites in `playAlarm` never use it. Larger diff, no benefit.

### Decision 4: Hardcoded volume (0.15) and hardcoded frequencies — no settings

**Choice:** No new field in `TimerSettingsSchema`. Volume and frequency are constants in the new functions.

**Rationale:** The user's stated intent is "make it feel like Pomofocus," not "give users audio configuration." Adding a settings field would add a settings UI surface, a panel test, a migration concern, and a default value to debate. None of that serves the stated goal. If a user finds the click too loud or too quiet later, the constant is a single-line change in one file. The alarm volume setting is intentionally _not_ shared with the click volume — they have different roles (alarm is a chime you can't miss, click is a tap you barely register), and tying them together would conflate them.

**Alternatives considered:**

- _Reuse `settings.alarmVolume` for the click too._ Saves a setting but couples two unrelated audio concerns. Rejected.
- _Add a single `uiSoundsEnabled: boolean`._ Costs a settings UI surface, gains a user who can mute clicks. Rejected for v1; the user said "let's use hard coded audio."

### Decision 5: Preemptively stub `AudioContext` in `test-setup.ts`

**Choice:** Add a no-op `AudioContextMock` and `vi.stubGlobal('AudioContext', AudioContextMock)` in `src/test-setup.ts`, even though no current test exercises an audio code path.

**Rationale:** Adding the wrapper introduces a code path that, if exercised by a future test, would throw `ReferenceError: AudioContext is not defined` in jsdom. The cost of preemptive stubbing is ~12 lines of mock and zero runtime behavior change. The cost of _not_ stubbing is a confusing test failure the first time someone writes a test that calls the wrapper, and a moment of "wait, was that broken before?"

**Alternatives considered:**

- _Wait until a test breaks, then add the stub._ Yagni: we don't pay for code that protects against a problem that doesn't exist. The counter-argument is that the wrapper is feature-internal and the test for it would arrive in the same change, so the stub is part of the cost of writing that test. Decision: include the stub; it's small, the alternative is a known footgun.
- _Try/catch around the audio call._ Hides errors and would be inconsistent with the existing `getAudioContext` (which lets the throw propagate). Rejected.

## Risks / Trade-offs

- **Click volume (0.15) is a guess.** No A/B test, no user feedback yet. If the click is too quiet to register or too loud relative to the alarm chord, the fix is a one-line constant change in `alarm.ts`. → _Mitigation_: keep the constant named (`CLICK_VOLUME`) so it's easy to find and easy to tune.

- **`alarm.ts` becomes misnamed after this change.** It will hold `playAlarm`, `playStartClick`, `playPauseClick`, and `togglePlayPauseWithClick` — three different audio concerns, not just the alarm. → _Mitigation_: flagged as a follow-up change. Renaming is mechanical (file rename + import updates in `TimerBar.tsx` and the barrel `index.ts`).

- **Browser autoplay policy could mute the click on first interaction in some browsers.** The current `getAudioContext` resumes a suspended `AudioContext` on first call, but some browsers require the resume to happen _inside_ a user-gesture handler. The spacebar shortcut and the play-button click are both user gestures, so the resume should succeed. The auto-rolling path does not call the wrapper, so this risk is contained. → _Mitigation_: if a user reports "no click on first press," the fix is a one-liner: ensure `getAudioContext` is called synchronously inside the keyboard/click handler before the click is scheduled.

- **The wrapper introduces a third "user play/pause" coordination point.** A future change that wants to add haptics (mobile vibration) or visual feedback (a tiny flash) would extend the wrapper. If the wrapper is forgotten, that future feedback would be missing from the keyboard path. → _Mitigation_: the wrapper has a single, descriptive name and is the only public "user play/pause" entry point in the feature. Future contributors reading `TimerBar.tsx:251` will see the wrapper and route through it.

- **Two ascending/descending sweeps at 0.15 volume might still be too quiet to register, or too distracting when pressed rapidly.** A user who rapidly toggles play/pause (debugging, fiddling) will hear many clicks. → _Mitigation_: same as the volume guess — a constant tweak. If the experience is bad, the right answer is a per-press debounce or a setting, but that's a follow-up if it surfaces.
