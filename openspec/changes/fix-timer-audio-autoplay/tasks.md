## 1. Audio lifecycle

- [x] 1.1 Add an idempotent `unlockAudio()` path that lazily creates an `AudioContext` only from user interaction and awaits `resume()`.
- [x] 1.2 Make interval-end alarm scheduling return without creating nodes when audio is not unlocked and the context is not running.
- [x] 1.3 Make play/pause clicks await a successful unlock before scheduling their sweep while preserving immediate timer state changes.
- [x] 1.4 Wire retryable `pointerdown` and `keydown` unlock listeners into the app shell.

## 2. Regression coverage

- [x] 2.1 Extend the AudioContext test double to observe oscillator creation and model suspended, delayed, and rejected resume states.
- [x] 2.2 Add unit tests for locked alarm drop, successful unlock, configured alarm scheduling, and failed/delayed unlock behavior.
- [x] 2.3 Add a TimerBar regression test proving an expired running interval still advances and does not replay its alarm after a later unlock.

## 3. Specification

- [x] 3.1 Add the autoplay-aware interval-end sound delta spec.
- [x] 3.2 Update the canonical `pomodoro-timer` sound and click requirements.

## 4. Verification

- [x] 4.1 Run `npm run format`.
- [x] 4.2 Run `npm run typecheck`.
- [x] 4.3 Run `npm run lint`.
- [x] 4.4 Run the full suite in a clean environment (`TOKEN_ENC_KEY='' GOOGLE_CLIENT_ID='' GOOGLE_CLIENT_SECRET='' npx vitest run`); the plain local `npm run test -- --run` remains environment-sensitive because repository credentials make the existing auth test expect the wrong status.
