## Why

Groups are auto-assigned colors from a small 8-color palette with no user control. The "General" group's red can collide with user groups after cycling wraps around. Users want more colors and the ability to pick their own.

## What Changes

- Expand palette from 8 to 16 oklch colors, evenly distributed on the hue wheel
- Fix color collision: user-created groups skip General's red (index 0)
- Add `setGroupColor` store action so group colors are mutable
- Add a color picker popover in group settings: 4x4 swatch grid + native `<input type="color">` for custom hex colors
- No new dependencies

## Capabilities

### New Capabilities

_None — this change is entirely within existing group-management capability._

### Modified Capabilities

- `group-management`: Color assignment changes from auto-only to user-controllable; palette expands from 8 to 16; General's color is excluded from auto-assignment pool.

## Impact

- `src/modules/groups/constants.ts` — expanded palette
- `src/modules/groups/store.ts` — new `setGroupColor` action, fixed `getGroupColorIndex`
- `src/modules/groups/components/GroupSettingsPanel.tsx` — color picker UI (dot → PopoverTrigger)
- `src/modules/groups/components/GroupSettingsPanel.test.tsx` — tests for color change
