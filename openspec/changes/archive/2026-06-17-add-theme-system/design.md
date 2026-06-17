## Context

DayBox currently has a single binary theme toggle (light/dark). The value is stored as `'light'` or `'dark'` under `daybox-theme` in localStorage. Colors are 40+ CSS custom properties defined in two static blocks (`:root` and `.dark`) in `index.css`. The `useTheme` hook in `app/theme.ts` uses `useSyncExternalStore` — no Zustand store. Only one component (`SettingsDrawer.tsx`) consumes it.

This design expands the theme model to support multiple named color presets and a system-auto mode, while keeping Tailwind `dark:` variant compatibility and minimizing flash.

## Goals / Non-Goals

**Goals:**

- Replace binary light/dark toggle with a **mode** (light / dark / system) and a **preset** (named palette e.g. default, nord, solarized)
- Apply theme tokens via JS `setProperty()` on `document.documentElement`
- Derive shadcn compatibility tokens from a fixed mapping of retained semantic tokens
- Migrate existing `daybox-theme` values to the new shape without data loss
- Keep CSS fallback for default preset to avoid flash on first paint
- Keep the `.dark` class toggle for Tailwind `dark:` variant support

**Non-Goals:**

- Theme editor or custom user-defined themes
- Community theme sharing or remote sync
- Cross-tab theme sync (same as current state)
- Including theme in export/import snapshots (unchanged from current)
- Inline script in `index.html` for non-default presets (flash accepted)

## Decisions

### 1. JS-driven token application over CSS class swapping

**Chosen**: Theme tokens are JS objects (`Record<string, string>`), applied at runtime via `element.style.setProperty()`.

**Rationale**: A single source of truth per preset makes adding new presets trivial (one file with two objects). CSS class-based approach would require N × 2 CSS blocks in `index.css`, which doesn't scale and would bloat the bundle with unused themes. No Tailwind `dark:` breakage because the `.dark` class is still toggled independently.

**Alternative**: CSS class per preset (`.theme-nord.light`, `.theme-nord.dark`, …). Rejected due to combinatorial explosion and lack of runtime programmability.

### 2. Two-tier token architecture: retained semantic tokens + derived shadcn tokens

**Chosen**: Each preset × mode defines only retained semantic tokens: tokens currently used directly by DayBox components or needed to derive shadcn tokens. Unused semantic tokens (`bg-active`, `accent-dim`, `accent-border`, `break-bg`, `lbreak-bg`, `overdue-border`, `success`) are dropped from the new theme contract. Shadcn compatibility tokens (`--background`, `--primary`, `--ring`, …) are auto-derived from a fixed mapping.

**Semantic tokens (per preset × mode):**

```ts
interface ThemeTokens {
  bg: string
  bgCard: string
  bgHover: string
  fg: string
  fg2: string
  fg3: string
  border: string
  borderStrong: string
  accent: string
  accentBg: string
  breakColor: string
  lbreakColor: string
  overdue: string
  overdueBg: string
}
```

Semantic token keys MUST be applied through an explicit CSS-variable-name map. Do not infer CSS names with simple `--${key}` prefixing because the existing CSS API uses kebab-case names and a few domain-specific suffixes:

```ts
const semanticCssVars: Record<keyof ThemeTokens, string> = {
  bg: '--bg',
  bgCard: '--bg-card',
  bgHover: '--bg-hover',
  fg: '--fg',
  fg2: '--fg-2',
  fg3: '--fg-3',
  border: '--border',
  borderStrong: '--border-strong',
  accent: '--accent',
  accentBg: '--accent-bg',
  breakColor: '--break-color',
  lbreakColor: '--lbreak-color',
  overdue: '--overdue',
  overdueBg: '--overdue-bg',
}
```

**Derivation mapping (fixed):**

```ts
function deriveShadcnTokens(t: ThemeTokens): Record<string, string> {
  return {
    '--background': t.bg,
    '--foreground': t.fg,
    '--card': t.bgCard,
    '--card-foreground': t.fg,
    '--popover': t.bgCard,
    '--popover-foreground': t.fg2,
    '--primary': t.accent,
    '--primary-foreground': 'oklch(1 0 0)',
    '--secondary': t.bgHover,
    '--secondary-foreground': t.fg,
    '--muted': t.bg,
    '--muted-foreground': t.fg3,
    '--accent-foreground': 'oklch(1 0 0)',
    '--destructive': t.overdue,
    '--destructive-foreground': 'oklch(1 0 0)',
    '--input': t.border,
    '--ring': t.accent,
  }
}
```

The default preset's CSS fallback in `index.css` MUST keep both the retained semantic CSS variables and the derived shadcn CSS variables. Runtime derivation is for applying JS themes after boot; it does not replace the default fallback needed before JS runs.

### 3. Preset file structure

Each preset is a file in `src/app/themes/` exporting a `ThemePreset` object:

```ts
export type ThemeMode = 'light' | 'dark'
export type ThemeModePreference = ThemeMode | 'system'
export type ThemePresetId = string

export interface ThemeSettings {
  mode: ThemeModePreference
  preset: ThemePresetId
}

export interface ThemePreset {
  id: ThemePresetId
  name: string
  modes: Partial<Record<ThemeMode, ThemeTokens>>
}
```

Presets may define only some modes. The system validates at selection and resolution time. Unknown presets fall back to `'default'`. Known presets with only one available mode normalize the stored mode to that mode. `system` is only offered when a preset has both light and dark variants, so following the OS never silently swaps to another preset.

### 4. Storage model and migration

**New key**: `daybox-theme` value is a JSON object (replacing the string):

```ts
const ThemeSettingsSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  preset: z.string(),
})
```

**Migration (runs once on app boot):**

1. Read raw value from `daybox-theme`
2. Try to parse as `{ mode, preset }` JSON → if valid, done
3. If it's the old string `'light'` or `'dark'`, infer `{ mode: oldValue, preset: 'default' }`, write new shape, done
4. If missing/unreadable, default to `{ mode: 'system', preset: 'default' }`
5. Migration is idempotent

### 5. Application flow

```
App boots → readThemeSettings() → migration if needed → cached
  → resolve(settings):
      preset = registry[settings.preset] ?? registry['default']
      allowedModes = availableModesForPreset(preset)
      if settings.mode not in allowedModes:
          normalize stored mode to first available manual mode
      effectiveMode = settings.mode === 'system'
          ? matchMedia('dark').matches ? 'dark' : 'light'
          : settings.mode
      tokens = preset.modes[effectiveMode]
      shadcnTokens = deriveShadcnTokens(tokens)
      apply semantic tokens through semanticCssVars
      apply derived shadcn tokens by exact CSS variable name
      documentElement.classList.toggle('dark', effectiveMode === 'dark')
      notify listeners
      before adding a matchMedia listener, remove any previous listener
      if mode === 'system': addListener matchMedia('dark') → re-resolve
```

### 6. Settings UI changes

Replace the single "Dark theme" switch with:

- **Theme preset**: A `Select` dropdown listing available presets by name
- **Mode**: Light / Dark / System selector that filters to modes available in the selected preset. System is available only when the selected preset has both light and dark variants.

The new hook API should be explicit enough for Settings UI wiring:

```ts
function useTheme(): {
  settings: ThemeSettings
  effectiveMode: 'light' | 'dark'
  presets: readonly ThemePreset[]
  availableModes: readonly ThemeModePreference[]
  setMode: (mode: ThemeModePreference) => void
  setPreset: (preset: ThemePresetId) => void
  setTheme: (settings: ThemeSettings) => void
}
```

## Risks / Trade-offs

- **Flash on non-default presets**: Default preset keeps semantic and shadcn CSS fallback variables in `index.css`. Non-default presets may flash default colors for one frame until JS boots. Accepted — the common case (default preset) has zero flash.
- **Missing preset**: If a preset is removed in a future update, users fall back to default. No data loss since theme settings aren't exported/imported.
- **Migration atomicity**: If the write to localStorage fails, the old string value remains and migration retries on next boot.
