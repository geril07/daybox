## 1. Token types and derivation

- [x] 1.1 Create `src/app/themes/types.ts` with `ThemeMode`, `ThemePresetId`, retained `ThemeTokens` interface (~14 color fields), `ThemePreset` interface, and `ThemeSettings` type (`{ mode, preset }`)
- [x] 1.2 Create `src/app/themes/derive-shadcn.ts` with `deriveShadcnTokens(ThemeTokens): Record<string, string>` and an explicit semantic key → CSS variable name map (e.g. `bgCard → --bg-card`, `fg2 → --fg-2`, `breakColor → --break-color`)

## 2. Preset definitions

- [x] 2.1 Create `src/app/themes/default.ts` — extract retained semantic token values from current `:root` and `.dark` into `light` and `dark` `ThemeTokens` objects
- [x] 2.2 Create `src/app/themes/nord.ts` — Nord palette light and dark variants (official Nord colors from nordtheme.com)
- [x] 2.3 Create `src/app/themes/solarized.ts` — Solarized palette light and dark variants (official Solarized colors from ethanschoonover.com)
- [x] 2.3a Create `src/app/themes/catppuccin.ts` — Catppuccin Latte (light) + Mocha (dark) palette using official Catppuccin v2 oklch values
- [x] 2.4 Create `src/app/themes/registry.ts` — export a `Map<ThemePresetId, ThemePreset>` of all registered presets, and a `DEFAULT_PRESET_ID = 'default'` constant

## 3. Theme barrel

- [x] 3.1 Create `src/app/themes/index.ts` — re-export types, registry, derive-shadcn, and all presets

## 4. Core theme engine (rewrite `src/app/theme.ts`)

- [x] 4.1 Define `ThemeSettingsSchema` with zod (`z.object({ mode: z.enum(['light', 'dark', 'system']), preset: z.string() })`) and export type
- [x] 4.2 Implement `readThemeSettings()` — reads `daybox-theme`, runs migration from old string format, falls back to `{ mode: 'system', preset: 'default' }`, returns validated `ThemeSettings`
- [x] 4.3 Implement `resolveTheme(settings): { settings, effectiveMode, tokens }` — resolves system mode via `matchMedia`, falls back unknown presets to default, normalizes invalid modes to the selected preset's first available mode, returns effective mode and token map
- [x] 4.4 Implement `applyTheme(tokens, effectiveMode)` — calls `setProperty` through the explicit semantic CSS variable map and for every derived shadcn token, toggles `dark` class
- [x] 4.5 Rewrite `useTheme()` to return an object API with `settings`, `effectiveMode`, `presets`, `availableModes`, `setMode`, `setPreset`, and `setTheme`; keep `getTheme()`/`setTheme()` on the new `ThemeSettings` model
- [x] 4.6 Add `systemModeMediaQueryListener` lifecycle — remove any existing listener before adding one, and remove it when mode changes away from `'system'`
- [x] 4.7 Module-level init: read settings → resolve → apply (replaces current top-level `readTheme()` + `applyTheme()`)

## 5. CSS cleanup

- [x] 5.1 Keep default preset `:root` and `.dark` fallback blocks with both retained semantic variables and derived shadcn variables, matching `default.ts`
- [x] 5.2 Remove only unused DayBox semantic variables and matching `@theme inline` entries (`bg-active`, `accent-dim`, `accent-border`, `break-bg`, `lbreak-bg`, `overdue-border`, `success`); do NOT remove shadcn fallback variables

## 6. Settings UI

- [x] 6.1 Replace the "Dark theme" `Switch` in `SettingsDrawer.tsx` with a preset `Select` dropdown ("Theme") showing names from the registry
- [x] 6.2 Add a mode selector that filters to modes available in the selected preset; offer system only when the preset has both light and dark variants; auto-select and persist the only available mode when needed

## 7. Theme tests

- [x] 7.1 Create `src/app/theme.test.ts` — test migration from old `'dark'` / `'light'` string to new `{ mode, preset }` shape
- [x] 7.2 Test `resolveTheme` — system mode resolution, missing preset fallback, invalid mode normalization, single-mode preset auto-select, and `matchMedia` listener cleanup
- [x] 7.3 Test `deriveShadcnTokens` — verify all expected token names are present and map correctly

## 8. Integration & verification

- [x] 8.1 Run `npm run typecheck` and fix any type errors
- [x] 8.2 Run `npm run lint` and fix any lint errors
- [x] 8.3 Run `npm run test` and ensure all tests pass (including existing pipeline tests — theme exclusion must still pass)
- [x] 8.4 Manual smoke test: toggle modes, switch presets, reload page, verify system-auto follows OS preference
