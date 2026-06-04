## Why

The current `src/shared/ui/` wrapper layer is hand-rolled with bugs, inconsistent patterns, and raw element bypass in consumer code. shadcn v4 now supports Base UI natively (`--base base`), giving us battle-tested, CLI-generated components backed by the same library we already use.

## What Changes

- Initialize shadcn v4 with `--base base` for Base UI variant
- Add `@/` path alias to tsconfig and vite config
- Replace all hand-rolled `src/shared/ui/` wrappers with CLI-generated shadcn components
- Adopt shadcn's CSS setup, adapt our theme (colors, spacing) into shadcn's CSS variable system
- **BREAKING**: Remove old wrapper files (button, toggle, select-menu, side-panel, alert-dialog, popover-card, range-slider, number-input)
- Add new shadcn components not currently present: Input, Label, Separator, Badge, Card, Tabs
- Update all consumer imports from old wrappers to new shadcn equivalents
- Replace raw `<button>` elements + inline styles in consumers with shadcn Button

## Capabilities

### New Capabilities
- `shared-ui`: Shared UI component library — shadcn v4 wrappers around base-ui primitives, available to all features

### Modified Capabilities

None. This is purely an implementation change to the UI layer — no requirement-level behavior changes.

## Impact

- `src/shared/ui/` — most files replaced, some renamed
- `src/index.css` — replaced with shadcn-generated CSS adapted to current theme
- `vite.config.ts` — add `resolve.alias`
- `tsconfig.app.json` — add `paths`
- All feature files importing from `shared/ui` need updated import paths/names
- `@base-ui/react` stays as dependency (now consumed via shadcn instead of directly)
