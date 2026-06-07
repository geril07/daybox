## 1. Audio primitives in alarm.ts

- [ ] 1.1 Add a private `playSweep(fromHz, toHz, duration, volume, delay = 0)` helper to `src/features/timer/alarm.ts`. It reuses the existing `getAudioContext` lazy init, creates one oscillator + one gain node, sets `osc.frequency` from `fromHz` at `t0` and ramps to `toHz` at `t0 + duration` via `linearRampToValueAtTime`, sets the gain envelope with exponential decay to 0.001 at `t0 + duration`, and starts/stops the oscillator at `t0` / `t0 + duration`.
- [ ] 1.2 Add a public `playStartClick()` export that calls `playSweep(800, 1200, 0.06, 0.15)` — ascending 60ms sine sweep, hardcoded.
- [ ] 1.3 Add a public `playPauseClick()` export that calls `playSweep(1200, 800, 0.06, 0.15)` — descending 60ms sine sweep, hardcoded.
- [ ] 1.4 Add a public `togglePlayPauseWithClick()` export that reads `useTimerStore.getState()`, picks `playPauseClick` if `state.isRunning` else `playStartClick`, plays the click, then calls `state.togglePlayPause()`. Import `useTimerStore` from `./store`.

## 2. Re-exports

- [ ] 2.1 Add `playStartClick`, `playPauseClick`, and `togglePlayPauseWithClick` to the re-exports in `src/features/timer/index.ts` (the existing `export * from './alarm'` covers this automatically — verify no named export changes are needed).

## 3. Call site updates

- [ ] 3.1 In `src/features/timer/components/TimerBar.tsx:251`, change the play button `onClick={togglePlayPause}` to `onClick={togglePlayPauseWithClick}`. Update the `togglePlayPause` selector to `togglePlayPauseWithClick` (or import the wrapper as a top-level import and use it directly in the JSX, matching the existing local-selector style).
- [ ] 3.2 In `src/app/App.tsx:34`, change the spacebar handler from `useTimerStore.getState().togglePlayPause()` to `togglePlayPauseWithClick()`. Add the wrapper to the existing `@/features/timer` import.

## 4. Test infrastructure

- [ ] 4.1 Append an `AudioContextMock` class to `src/test-setup.ts` and call `vi.stubGlobal('AudioContext', AudioContextMock)`. The mock exposes `state = 'running'`, `currentTime = 0`, `destination = {}`, a no-op `resume()`, and `createOscillator` / `createGain` factories that return objects with no-op `setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`, `connect`, `start`, `stop`, and a writable `type` property.

## 5. Verification

- [ ] 5.1 Run `npm run typecheck` — confirm no new TypeScript errors.
- [ ] 5.2 Run `npm run lint` — confirm no new lint warnings.
- [ ] 5.3 Run `npm run test` — confirm all existing tests still pass and the `AudioContext` mock prevents any new throw in jsdom.
- [ ] 5.4 Run `npm run build` — confirm production build succeeds.
- [ ] 5.5 Manually verify in `npm run dev`: click play from idle → hear ascending click. Click again → hear descending click. Press spacebar from idle → ascending click. Set `autoStartBreaks` on, let a focus interval end → hear only the alarm chord, no click. Click a different task while the timer is running → no click.
