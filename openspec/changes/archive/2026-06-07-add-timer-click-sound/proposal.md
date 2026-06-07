## Why

The Pomodoro timer is the protagonist of DayBox, but every interaction with it is silent. The only audio in the app today is the end-of-interval alarm; pressing the play button (or hitting space) swaps a `Play` icon for a `Pause` icon and that is the entire feedback. The timer feels inert. A short click sound on each user play/pause gesture — the kind of micro-feedback Pomofocus has had for years — would make the timer feel alive without adding any user-facing settings.

This is a polish feature, not a capability expansion. It is hardcoded: one ascending sweep for play/resume, one descending sweep for pause, a fixed modest volume, no on/off toggle, no sound picker. The intent is "the button feels like a real button," not "give users audio configuration."

## What Changes

- **Add a `playStartClick` and `playPauseClick` audio primitive** to `src/features/timer/alarm.ts`. Both are 60ms sine sweeps; `playStartClick` sweeps 800 Hz → 1200 Hz (ascending), `playPauseClick` sweeps 1200 Hz → 800 Hz (descending). Volume is hardcoded to 0.15. These reuse the existing `AudioContext` lazy-init pattern.
- **Add a `togglePlayPauseWithClick` wrapper** that reads the current `isRunning` state from `useTimerStore`, plays the matching click (`playPauseClick` if running, `playStartClick` otherwise), then calls `togglePlayPause`. The sound matches the *current* state — the gesture that is being undone, not the one being made.
- **Route both call sites through the wrapper** so the sound fires consistently for click and keyboard:
  - `src/features/timer/components/TimerBar.tsx:251` — the play button `onClick`
  - `src/app/App.tsx:34` — the spacebar shortcut
- **Stub `AudioContext` in `test-setup.ts`** with a no-op mock so audio code paths do not throw in jsdom. Twelve lines, no actual audio plays in tests.

The store is untouched. The schema is untouched. The settings panel is untouched. Persistence is untouched. The end-of-interval alarm is untouched.

## Capabilities

### Modified Capabilities

- `pomodoro-timer`: add a requirement that the user play/pause gesture produces a click sound, with ascending pitch for the paused/idle → running transition and descending pitch for the running → paused transition. The requirement also pins down that system-initiated state changes (auto-rolling into the next phase, switching focused task while the timer is running) SHALL NOT produce a click sound.

## Impact

- `src/features/timer/alarm.ts` — new `playSweep` private helper plus the three new public exports (`playStartClick`, `playPauseClick`, `togglePlayPauseWithClick`). File becomes misnamed (it now contains three different audio primitives, not just the alarm); renaming to `audio.ts` is flagged as a follow-up.
- `src/features/timer/index.ts` — re-export the three new symbols.
- `src/features/timer/components/TimerBar.tsx` — one call-site swap at the play button.
- `src/app/App.tsx` — one call-site swap at the spacebar handler.
- `src/test-setup.ts` — append the `AudioContextMock` and `vi.stubGlobal`.

No new files, no schema additions, no settings UI, no persistence changes, no data model changes. The future `add-timer-focus-mode` change's play button will route through the same wrapper.

## Out of scope

- Renaming `alarm.ts` to `audio.ts` (or splitting it). Flagged as a follow-up once this change is in; the misnaming becomes more obvious after this change lands.
- Any user-facing settings for the click sound: on/off toggle, volume, sound choice, "play sample" button. Explicitly rejected for v1 to keep the change tiny and the feel consistent.
- Click sounds on system-initiated state changes: auto-rolling into the next phase (`advancePhase({ autoStart: true })`), switching focused task while the timer is running (`focusTask` when `isRunning` was true), and `skip` (which calls `advancePhase`). These all bypass `start()`/`pause()` and the new wrapper, so the architectural separation handles them for free.
- Modifying the end-of-interval alarm sound or its settings.
- Haptic feedback (mobile vibration, etc.). Could be added later by extending the wrapper to call `navigator.vibrate(...)` alongside the audio, but not now.
