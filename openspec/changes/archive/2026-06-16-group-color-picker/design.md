## Context

Groups currently get auto-assigned colors from a hardcoded 8-color oklch palette. Colors cycle by index via `getGroupColorIndex()`. The default "General" group takes `GROUP_COLORS[0]` (warm red-orange). Users cannot change a group's color after creation. After 8 total groups, a user-created group wraps to index 0 and collides with General's red.

## Goals / Non-Goals

**Goals:**

- Let users change a group's color via a picker in the group settings panel
- Expand the palette from 8 to 16 evenly-spaced oklch colors
- Prevent user-created groups from ever getting General's red
- Support custom hex colors via native `<input type="color">`
- Zero new dependencies

**Non-Goals:**

- Full color-picker library integration
- OKLCH↔HEX conversion utility (hex is stored as-is)
- Persist custom-color state beyond what existing store persistence already handles
- Animate color transitions

## Decisions

### 1. Custom swatch popover + native `<input type="color">` — no library

**Chosen over:** react-colorful or other color-picker library.

**Rationale:** Reuses existing `@base-ui/react` Popover compound component pattern. No bundle cost increase. The swatch grid renders as a 4×4 flexbox of rounded `<button>` elements. The native input handles the "custom color" path. No conversion needed — oklch strings and hex strings are both valid CSS `background` values.

### 2. Mixed color format storage (oklch for palette, hex for custom)

**Chosen over:** converting everything to oklch via `culori` or hand-rolled math.

**Rationale:** The `Group.color` field is `z.string()` — any CSS color value works. Storing hex directly from the native picker avoids conversion logic and a new dependency. The tradeoff (swatch grid can't highlight "selected" for custom hex colors) is cosmetic and rare — it only matters when a user has explicitly chosen a custom color, and the color dot itself still renders correctly.

### 3. General's color excluded from the auto-assignment pool

**Implementation:** `getGroupColorIndex()` becomes `((groups.length - 1) % 15) + 1`. This skips index 0 (General's red) entirely. User-created groups cycle through indices 1–15.

**Chosen over:** removing General's color from the palette array. Keeping it at index 0 is cleaner — it's the canonical "General" color and the palette constants file is the single source of truth.

### 4. Palette: 16 oklch colors, hue-steps of 22.5°

Lightness fixed at 0.55, chroma at 0.15 for consistency. Hues: 0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5. This covers the full hue wheel with no duplicates.

## Risks / Trade-offs

- **Hex colors in a mixed-format store** → No validation distinguishes oklch from hex; but CSS `background` handles any valid value. Format mismatch is invisible to the user.
- **Swatch grid doesn't highlight custom colors** → Cosmetic. Mitigated: the color dot itself shows the current color. A "Custom" label near the native input can be added trivially if needed.
- **Expanded palette still limited to 16** → Users who want anything can use the native picker, so the palette is a convenience, not a constraint.
