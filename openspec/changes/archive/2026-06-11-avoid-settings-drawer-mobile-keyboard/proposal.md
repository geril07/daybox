## Why

Opening the Settings drawer on mobile currently focuses the first timer number input, which summons the virtual keyboard before the user has expressed intent to edit a value. This is distracting for a mixed settings drawer where the primary action is browsing and adjusting controls, not immediate text entry.

## What Changes

- Move initial dialog focus for the Settings drawer to the drawer surface instead of the first focusable form control.
- Keep focus inside the dialog on open so keyboard and assistive technology users are not left behind the overlay.
- Avoid changing the shared `Sheet` wrapper; rely on React 19 `ref` as a prop and the existing prop forwarding from `SheetContent` to Base UI's dialog popup.
- Preserve existing drawer layout, sections, settings controls, close behavior, and persisted settings.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `settings`: Settings drawer initial focus behavior changes so opening the drawer does not automatically activate a text or numeric input.

## Impact

- Affected code: `src/app/shell/SettingsDrawer.tsx`.
- Out of scope: shared `Sheet` wrapper changes.
- No storage schema, dependency, API, or migration impact.
