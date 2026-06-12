## Why

Browser notifications on Pomodoro interval end are **partially built but unreachable**. The shared `sendNotification` helper exists, the timer already calls it on every real interval completion, and the `pomodoro-timer` spec already has a "Browser notification on interval end" requirement. None of it works in practice for a new user, because:

- The system **never asks** for permission — the user has to dig into the browser's address-bar padlock UI to grant it.
- There is **no settings toggle** — the only way to silence the OS-level notification is to revoke permission entirely, which also breaks it for any other reason the user might want it (and there's no indication anywhere in the app that the permission is even involved).
- The notification fires **even when the user is actively looking at the tab** — useful for the AFK case, noisy for the in-focus case.

This change closes the loop: a user-controlled toggle in the timer settings panel, an explicit "Enable notifications" button that triggers the permission prompt on user demand (never implicitly), and a visibility rule so the OS notification only fires when the DayBox tab is hidden. The end-of-interval sound is unchanged and always plays.

## What Changes

- **New `notificationsEnabled` preference on `TimerSettings`**, default `true`, persisted under `daybox-timer`. Lets the user opt out of OS notifications without revoking browser permission.
- **New "Notifications" group in `TimerSettingsPanel`**: a `Switch` bound to `notificationsEnabled`, plus a separate row whose button label and action track the live `Notification.permission` state — `default` → "Enable notifications" (calls `requestNotificationPermission()`), `granted` → "Disable notifications" (toggles the Switch off), `denied` → "Blocked in browser settings" (disabled, with a hint to use the address-bar padlock).
- **New `shouldFireIntervalEndNotification(visible, permission, enabled)` pure function** in `src/shared/notifications/` that encodes the gating policy. The three inputs are read at call time; the function is the single source of truth for "do we fire a notification now?".
- **Gated call in `TimerBar`**: the existing `sendNotification(...)` invocation is replaced with a check against the pure function. End-of-interval alarm sound is unchanged and unconditional.
- **Click-to-focus tab**: the notification's `onclick` handler calls `window.focus()` so the OS notification also acts as a "come back to DayBox" affordance. `sendNotification` grows an optional `onClick` callback.
- **Permission state refresh**: the settings panel re-reads `Notification.permission` on `visibilitychange` so the button label updates if the user changes the permission via browser chrome and returns to the tab.
- **Schema migration**: `TimerSettingsSchema` gains `notificationsEnabled: z.boolean().default(true)`, and the timer's `afterValidate` callback backfills the field for any pre-existing persisted state. The default + the rehydrate fallback together guarantee that users with a previously persisted `daybox-timer` end up with the new field populated as `true` and the system keeps running.

## Capabilities

### Modified Capabilities

- `pomodoro-timer`: the existing "Browser notification on interval end" requirement is tightened to defer to four new requirements covering the toggle, permission flow, panel UI, visibility rule, and click-to-focus behavior.

## Impact

- `src/features/timer/schema.ts` — one new field with a zod default.
- `src/features/timer/store.ts` — default settings + a one-line backfill in `afterValidate`.
- `src/features/timer/components/TimerBar.tsx` — call site uses the pure gating function; adds `window.focus()` to the notification's `onclick`.
- `src/features/timer/components/TimerSettingsPanel.tsx` — new "Notifications" group with Switch + permission-state button row.
- `src/shared/notifications/notifications.ts` — `sendNotification` gains an optional `onClick` parameter; new `shouldFireIntervalEndNotification` helper exported.
- `src/shared/notifications/index.ts` — barrel re-exports the new helper.
- `src/test-setup.ts` — `NotificationMock` stub for jsdom (mirrors the existing `ResizeObserverMock` / `AudioContextMock` pattern).
- New tests for `notifications.ts` (pure helper, sendNotification with/without permission) and `TimerSettingsPanel` (the three permission states, with a `vi.spyOn` on `Notification` to flip `permission` per test).
- Extended `TimerBar.test.tsx` — a scenario that asserts no `new Notification` call when `visibilityState === 'visible'`, and one that asserts it does fire when hidden with permission granted and the toggle on.

## Out of scope

- A "test notification" / "preview" button in settings — the user can verify the toggle by waiting for a real interval, same as the alarm sound today.
- Per-phase notification content customization (different text for focus vs. short break vs. long break beyond what already exists).
- Any change to the alarm sound or its gating.
- Notification icons / branding (we have no app icon set up).
- A different permission UX on mobile Safari, where `Notification.permission` behavior differs — out of scope; standard web behavior is accepted.
