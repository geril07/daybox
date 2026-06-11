# Design

## Gating policy as a pure function

The single most important architectural decision: **the "should we fire a notification?" decision lives in one pure function** that takes `(visible, permission, enabled)` and returns a `boolean`. The call site in `TimerBar` reads those three values at call time and dispatches.

```ts
// src/shared/notifications/policy.ts
export function shouldFireIntervalEndNotification(input: {
  documentVisible: boolean
  permission: NotificationPermission
  enabled: boolean
}): boolean {
  return (
    input.enabled && input.permission === 'granted' && !input.documentVisible
  )
}
```

Why a pure function:

- **Testability** — no jsdom, no React, no `Notification` global. Tests are fast, exhaustive, and cover all 2 × 3 × 2 = 12 input combinations.
- **Documented policy** — the function's name and signature are the canonical statement of when a notification fires. New code paths can't accidentally drift.
- **Read-site clarity** — `TimerBar` reads as "if policy says yes, send; always play sound", which matches the spec.

## Settings panel layout

Two controls, separate concerns:

```
┌─ Notifications ─────────────────────────────┐
│  Notify on interval end    [▓▓▓░░ Switch ]  │   ← preference (in-app)
│  Browser permission        [ Enable...   ]  │   ← browser state + action
└─────────────────────────────────────────────┘
```

- The **Switch** is bound to `settings.notificationsEnabled`. Default `true`. Persists under `daybox-timer`.
- The **permission button** reflects `Notification.permission`:
  - `default` → label "Enable notifications", click → `await requestNotificationPermission()`.
  - `granted` → label "Disable notifications", click → set `notificationsEnabled = false`.
  - `denied` → label "Blocked in browser settings", `disabled`, no action.
- A small hint under the button in the `default` and `denied` rows explains what the user is consenting to (one sentence).
- The component subscribes to `visibilitychange` to re-read `Notification.permission` when the user returns to the tab after fiddling with browser chrome.

Why two controls, not one smart hybrid: the verbs differ ("enable" / "disable" / "blocked"). Smushing them into a Switch forces the component to override the Switch's checked/disabled visual states in ways that the shadcn Switch primitive does not cleanly support. Two rows in a 680px-wide drawer cost nothing.

## Schema migration

`createValidatedRehydrate` (in `src/shared/utils/persistence.ts`) treats zod as a **validator, not a transformer**: the `safeParse` result is used only for the success/failure signal; the parsed-with-defaults output is discarded. This means a zod `.default(true)` would _validate_ old state as legal but would not actually populate the new field on the rehydrated store object.

Two-line belt-and-suspenders:

1. **Add `.default(true)` in the schema** so `safeParse({ focusDuration: 25 })` succeeds — without this, every existing user with a persisted `daybox-timer` would fail validation and the whole timer state would reset to defaults on next load (silent data loss of the `elapsed` / `startedAt` runtime).
2. **Add a backfill in the timer's `afterValidate`** (already the home of rehydrate fixups — see the wall-clock-correction block at `store.ts:195`):

   ```ts
   afterValidate: (state) => {
     state.settings.notificationsEnabled ??= true
     if (state.isRunning && state.startedAt) {
       const now = Date.now()
       state.elapsed += now - state.startedAt
       state.startedAt = now
     }
   }
   ```

This pattern is preferable to a one-off migration key because the same field can be added/removed in the future with the same backfill idiom.

## `sendNotification` signature

The current signature is `sendNotification(title: string, body?: string): void`. The click-to-focus behavior is best modeled as an optional `onClick` parameter on the helper, defaulting to no-op, so all existing call sites keep working without change.

```ts
export function sendNotification(
  title: string,
  body?: string,
  onClick?: () => void,
): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, { body })
  if (onClick) n.onclick = onClick
}
```

`onclick` is not a constructor option on `Notification`; it must be assigned to the instance. The helper centralizes that pattern so the call site stays clean.

## `TimerBar` call-site change

Today (one block, after the alarm):

```ts
playAlarm(...)
sendNotification(
  phase === 'focus' ? 'Focus complete!' : `... complete!`,
  focusedTask ? `Task: ${focusedTask.title}` : undefined,
)
```

After:

```ts
playAlarm(...)
if (shouldFireIntervalEndNotification({
  documentVisible: document.visibilityState === 'visible',
  permission: Notification.permission,
  enabled: settings.notificationsEnabled,
})) {
  sendNotification(
    phase === 'focus' ? 'Focus complete!' : `... complete!`,
    focusedTask ? `Task: ${focusedTask.title}` : undefined,
    () => window.focus(),
  )
}
```

The `playAlarm` call is deliberately unchanged. The sound is the in-app feedback; the OS notification is the away-from-tab feedback. Decoupling them is the whole point.

## jsdom test setup

`src/test-setup.ts` gains a `NotificationMock` that mirrors the `ResizeObserverMock` / `AudioContextMock` shape. The mock has a mutable `permission` field so tests can flip it per scenario. `new Notification(...)` returns a minimal instance object whose `onclick` can be set and invoked (we `vi.fn()` it in the firing-assertion test).

```ts
class NotificationMock {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(
    async () => 'granted' as NotificationPermission,
  )
  onclick: (() => void) | null = null
  constructor(_title: string, _opts?: NotificationOptions) {}
}
vi.stubGlobal('Notification', NotificationMock)
```

The existing `'Notification' in window` guard in `notifications.ts` means existing tests that don't touch the new path keep working without any changes — `'Notification' in window` returns `true` once the stub is in place, and the no-op / actual-fire paths both behave correctly depending on `NotificationMock.permission`.

## What the test matrix covers

| Test                                      | Visibility | Permission | Enabled | Expects                                          |
| ----------------------------------------- | ---------- | ---------- | ------- | ------------------------------------------------ |
| `shouldFireIntervalEndNotification` table | 6 of 12    | 3 of 3     | 2 of 2  | boolean truth table                              |
| `sendNotification` no-op when unsupported | —          | —          | —       | does not throw, no Notification call             |
| `sendNotification` no-op when not granted | hidden     | denied     | true    | does not construct Notification                  |
| `sendNotification` fires when granted     | hidden     | granted    | true    | constructs Notification, assigns onclick         |
| `TimerSettingsPanel` default state        | —          | default    | true    | Switch on, button says "Enable"                  |
| `TimerSettingsPanel` granted state        | —          | granted    | true    | Switch on, button says "Disable"                 |
| `TimerSettingsPanel` denied state         | —          | denied     | true    | Switch on, button disabled, label "Blocked"      |
| `TimerSettingsPanel` click enable         | —          | default    | true    | click → `Notification.requestPermission` called  |
| `TimerBar` no notify when visible         | visible    | granted    | true    | `new Notification` not called, sound still plays |
| `TimerBar` notify when hidden             | hidden     | granted    | true    | `new Notification` called once, `onclick` set    |

## Rejected alternatives

- **"Prompt on first interval completion"** — feels naggy, and the spec on click sounds was very explicit that user-initiated gestures should not be conflated with system events. We treat notification permission the same way.
- **Single smart Switch** — the disabled/blocked states for permission look bad when overlaid on a Switch's checked/unchecked visual model. Two rows is simpler and more honest about the two distinct concepts.
- **Reading `Notification.permission` lazily inside `shouldFireIntervalEndNotification`** — the helper stays a pure function. Call sites pass it in. Easier to test, easier to reason about.
- **Polling `Notification.permission` from a `setInterval`** — wasteful and racy. `visibilitychange` already fires when the user returns to the tab after changing browser settings; one re-read on that event is enough.
- **Generic `tag: 'daybox-end'`** so the OS replaces a previous notification — not necessary in practice; the only way to get two notifications in flight is a clock issue, and the next change would just _be_ the next one. YAGNI.
