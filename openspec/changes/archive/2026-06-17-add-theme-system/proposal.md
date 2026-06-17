## Why

DayBox currently only toggles between a single light and dark palette. Users who prefer other color schemes (Nord, Solarized, Catppuccin) or want the app to follow the OS theme automatically have no options. The palette is baked into CSS with no room for expansion.

## What Changes

- Replace the binary light/dark toggle with a **mode** selector (light / dark / system-auto) and a **preset** picker (named color palettes)
- Define theme tokens as JS objects instead of static CSS blocks, applied via `setProperty()` at runtime
- Extract the current palette into a `default` preset; add at least one new preset
- Keep the `.dark` class on `<html>` for Tailwind `dark:` variant compatibility
- Derive shadcn tokens from a fixed mapping of the retained semantic tokens, reducing per-preset boilerplate
- Migrate existing `daybox-theme` value (`'light'` / `'dark'`) to the new `{ mode, preset }` shape
- The default preset keeps both semantic and shadcn CSS variables in the `:root` / `.dark` fallback in `index.css`; non-default presets may flicker briefly to default colors (accepted)

## Capabilities

### New Capabilities

- `theme-system`: Theme model (mode + preset), JS-driven token application, preset registry, token derivation, migration, and the `useTheme` hook

### Modified Capabilities

- `settings`: "User can switch theme" requirement expands from binary toggle to mode selector + preset picker
- `data-persistence`: Theme storage key shape changes; migration logic handles old format

## Impact

- `src/app/theme.ts` — rewrites from binary enum to mode+preset model, JS-driven token application, migration
- `src/app/themes/` — new directory with preset definitions, token types, registry, derived shadcn tokens
- `src/app/shell/SettingsDrawer.tsx` — replaces Switch with mode selector + preset picker
- `src/index.css` — keeps default-preset fallback variables, removes unused DayBox semantic tokens, shadcn `@theme inline` stays
- `src/modules/data-portability/` — no code changes needed (theme remains excluded from snapshots)
