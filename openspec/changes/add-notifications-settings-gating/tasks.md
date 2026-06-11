# Tasks

## 1. Shared notification policy + sendNotification signature

- [ ] 1.1 Add `shouldFireIntervalEndNotification` pure function in `src/shared/notifications/policy.ts` with the three-input signature documented in design.md.
- [ ] 1.2 Export it from `src/shared/notifications/index.ts`.
- [ ] 1.3 Extend `sendNotification` in `src/shared/notifications/notifications.ts` with an optional `onClick` parameter; assign to `n.onclick` on the constructed instance.
- [ ] 1.4 Tests: `src/shared/notifications/policy.test.ts` covering all 12 input combinations of the truth table.
- [ ] 1.5 Tests: extend `src/shared/notifications/notifications.test.ts` (create if absent) covering the no-op-when-unsupported, no-op-when-not-granted, fires-when-granted, and onclick-is-assigned scenarios.

## 2. Timer schema + store backfill

- [ ] 2.1 Add `notificationsEnabled: z.boolean().default(true)` to `TimerSettingsSchema` in `src/features/timer/schema.ts`.
- [ ] 2.2 Add `notificationsEnabled: true` to `DEFAULT_TIMER_SETTINGS` in `src/features/timer/store.ts`.
- [ ] 2.3 Add `state.settings.notificationsEnabled ??= true` to the `afterValidate` callback in `createValidatedRehydrate` config (alongside the existing wall-clock correction).
- [ ] 2.4 Tests: extend `src/features/timer/store.test.ts` (or create) with a rehydrate scenario that feeds a persisted state without the new field and asserts `settings.notificationsEnabled === true` post-rehydrate, and that a persisted state with `notificationsEnabled: false` is preserved (not overwritten by the default).

## 3. Settings panel UI

- [ ] 3.1 Create `NotificationSettingsRow` (or inline) inside `TimerSettingsPanel.tsx` that renders a new "Notifications" group with:
  - A `Switch` bound to `settings.notificationsEnabled`.
  - A `Button` whose label and behavior depend on `Notification.permission` (default / granted / denied).
  - A small hint sentence under the button in the `default` and `denied` states.
- [ ] 3.2 Subscribe the panel (or a small hook) to `document.visibilitychange` and re-read `Notification.permission` on transition to visible. Use a local `useState` to hold the live permission value so the button re-renders.
- [ ] 3.3 Style: match the existing `SettingRow` / section spacing in `TimerSettingsPanel.tsx`.
- [ ] 3.4 Tests: `src/features/timer/components/TimerSettingsPanel.test.tsx` with scenarios for the three permission states; flip `NotificationMock.permission` per test and assert label + behavior.

## 4. TimerBar gating

- [ ] 4.1 Replace the unconditional `sendNotification(...)` call in `TimerBar.tsx`'s end-of-interval effect with a `shouldFireIntervalEndNotification({ documentVisible, permission, enabled })` check.
- [ ] 4.2 Read `document.visibilityState` and `Notification.permission` at the call site, not in the helper (helper stays pure).
- [ ] 4.3 Pass `() => window.focus()` as the `onClick` to `sendNotification`.
- [ ] 4.4 Tests: extend `src/features/timer/components/TimerBar.test.tsx` with two scenarios — visible tab does not fire (sound still plays), hidden tab with permission granted does fire and assigns an onclick. Use `Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })` for the hidden scenario and restore in `afterEach`.

## 5. Test infrastructure

- [ ] 5.1 Add a `NotificationMock` class to `src/test-setup.ts` with mutable static `permission` and a `vi.fn` for `requestPermission`. Stub it via `vi.stubGlobal('Notification', NotificationMock)`.
- [ ] 5.2 Confirm the existing `TimerBar.test.tsx` (no notification assertions) still passes with the stub in place — the `'Notification' in window` guard should not break.

## 6. Spec delta

- [ ] 6.1 Write the four new `ADDED Requirements` and one `MODIFIED Requirements` block (replacing the current "Browser notification on interval end" requirement) in `openspec/changes/add-notifications-settings-gating/specs/pomodoro-timer/spec.md`. Each new requirement has its own `Scenario` block, matching the format of the existing spec.

## 7. Verify

- [ ] 7.1 `npm run format`
- [ ] 7.2 `npm run typecheck`
- [ ] 7.3 `npm run lint`
- [ ] 7.4 `npm run test` (full suite green)
- [ ] 7.5 `openspec validate add-notifications-settings-gating --strict`
