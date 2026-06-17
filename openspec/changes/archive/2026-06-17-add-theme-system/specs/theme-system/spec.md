## ADDED Requirements

### Requirement: Theme model is mode + preset

The system SHALL represent the user's theme selection as a `{ mode, preset }` object persisted under `daybox-theme` in localStorage. The `mode` field SHALL be `'light'`, `'dark'`, or `'system'`. The `preset` field SHALL be a string identifier matching a registered preset.

#### Scenario: New user gets system mode

- **WHEN** the app loads for the first time and `daybox-theme` does not exist
- **THEN** the theme defaults to `{ mode: 'system', preset: 'default' }`

#### Scenario: Settings are validated on read

- **WHEN** `daybox-theme` contains invalid JSON or an unknown mode value
- **THEN** the system defaults to `{ mode: 'system', preset: 'default' }`

### Requirement: Migration from old theme format

The system SHALL migrate the legacy `'light'` / `'dark'` string value in `daybox-theme` to the new `{ mode, preset }` object format on app boot. Migration SHALL be idempotent.

#### Scenario: Legacy 'dark' value is migrated

- **WHEN** `daybox-theme` contains the string `'dark'`
- **THEN** the stored value is replaced with `{ mode: 'dark', preset: 'default' }`
- **AND** the effective theme is dark with the default preset

#### Scenario: Legacy 'light' value is migrated

- **WHEN** `daybox-theme` contains the string `'light'`
- **THEN** the stored value is replaced with `{ mode: 'light', preset: 'default' }`
- **AND** the effective theme is light with the default preset

#### Scenario: Migration is idempotent

- **WHEN** the stored value is already in the new `{ mode, preset }` format
- **THEN** no migration occurs and the value is used as-is

### Requirement: System-auto mode follows OS preference

When `mode` is `'system'`, the system SHALL resolve the effective light/dark mode from `window.matchMedia('(prefers-color-scheme: dark)')` and update the UI whenever the OS preference changes.

#### Scenario: System dark preference applies dark theme

- **WHEN** mode is `'system'` and the OS is in dark mode
- **THEN** the effective theme is dark
- **AND** the `dark` class is present on `<html>`

#### Scenario: System light preference applies light theme

- **WHEN** mode is `'system'` and the OS is in light mode
- **THEN** the effective theme is light
- **AND** the `dark` class is absent from `<html>`

#### Scenario: OS preference change updates theme live

- **WHEN** mode is `'system'` and the OS switches from light to dark mode
- **THEN** the UI switches to dark theme without a page reload

### Requirement: JS-driven token application

The system SHALL apply theme color tokens to `document.documentElement` at runtime using `element.style.setProperty()`. Semantic token keys SHALL be applied through an explicit key-to-CSS-variable-name map, not by simple string prefixing. Tokens SHALL include all retained semantic tokens defined by the active preset and all derived shadcn compatibility tokens.

#### Scenario: Semantic tokens are set from the active preset

- **WHEN** the theme is resolved to a light default preset
- **THEN** `document.documentElement` has `--bg`, `--bg-card`, `--fg-2`, `--fg-3`, `--break-color`, `--lbreak-color`, and other retained semantic CSS variables set to the preset's light mode values

#### Scenario: Semantic token names are mapped explicitly

- **WHEN** the theme engine applies a preset with `bgCard`, `fg2`, and `breakColor` token keys
- **THEN** it writes `--bg-card`, `--fg-2`, and `--break-color`
- **AND** it does NOT write `--bgCard`, `--fg2`, or `--breakColor`

#### Scenario: Shadcn tokens are derived and set

- **WHEN** the theme is resolved
- **THEN** `document.documentElement` has `--background`, `--foreground`, `--primary`, `--ring`, and other shadcn tokens set
- **AND** `--primary` equals `--accent` from the preset
- **AND** `--card` equals `--bg-card` from the preset

#### Scenario: Preset change updates all tokens

- **WHEN** the user switches from the default preset to Nord
- **THEN** all CSS custom properties on `document.documentElement` are updated to the Nord preset values

### Requirement: Dark class toggle for Tailwind compatibility

The system SHALL toggle the `dark` class on `document.documentElement` based on the resolved effective mode. Tailwind `dark:` variants SHALL continue to work for all presets.

#### Scenario: Dark mode adds the dark class

- **WHEN** the effective mode is dark
- **THEN** `document.documentElement.classList` contains `'dark'`

#### Scenario: Light mode removes the dark class

- **WHEN** the effective mode is light
- **THEN** `document.documentElement.classList` does NOT contain `'dark'`

#### Scenario: dark: variant works with non-default preset

- **WHEN** the user selects the Nord preset and dark mode
- **THEN** elements using `dark:bg-card` Tailwind classes render the Nord dark card color

### Requirement: Preset registry

The system SHALL maintain a registry of available theme presets. Each preset SHALL define an `id`, display `name`, and a `modes` map containing at least one mode with its token values.

#### Scenario: Default preset is always available

- **WHEN** the app loads
- **THEN** the `'default'` preset is always present in the registry

#### Scenario: Registry exposes available preset ids

- **WHEN** the UI queries available presets
- **THEN** the registry returns all registered preset objects with their `id`, `name`, and `modes`

### Requirement: Missing preset fallback

When the stored preset identifier does not match any registered preset, the system SHALL fall back to the `'default'` preset. When a registered preset does not support the stored mode, the system SHALL normalize the stored mode to that preset's first available manual mode. `system` mode SHALL only be available for presets that define both light and dark variants.

#### Scenario: Unknown preset falls back to default

- **WHEN** `daybox-theme` contains `{ mode: 'dark', preset: 'deleted-theme' }` and `'deleted-theme'` is not in the registry
- **THEN** the effective theme uses the default preset in dark mode

#### Scenario: Missing mode normalizes to selected preset mode

- **WHEN** the active preset only defines a `dark` mode but the effective mode is light
- **THEN** the stored mode is replaced with `'dark'`
- **AND** the effective theme uses the selected preset in dark mode

#### Scenario: Single-mode preset auto-selects

- **WHEN** the active preset only defines a `dark` mode and the stored mode is `'light'`
- **THEN** the effective mode is automatically set to `'dark'`
- **AND** the stored mode is updated to `'dark'`

#### Scenario: System mode requires both variants

- **WHEN** the active preset only defines a `dark` mode
- **THEN** `system` is not an available mode for that preset

### Requirement: Default preset has CSS fallback

The system SHALL keep the default preset's light and dark retained semantic token values and derived shadcn token values as CSS custom properties in `:root` and `.dark` blocks in `index.css` to ensure the default theme renders correctly before JavaScript boots.

#### Scenario: Default theme renders without flash

- **WHEN** the user has the default preset selected and reloads the page
- **THEN** the correct colors are visible before the JS module evaluates
- **AND** shadcn utilities such as `bg-background`, `text-foreground`, and `bg-primary` have defined CSS variables before JS runs

#### Scenario: Non-default preset may flash

- **WHEN** the user has the Nord preset selected and reloads the page
- **THEN** the default preset colors are briefly visible until JS applies the Nord tokens

### Requirement: Theme is excluded from save snapshots

The system SHALL NOT include theme settings in save snapshots built for export or Google Drive backup. Theme SHALL remain untouched during import.

#### Scenario: Export excludes theme

- **WHEN** the user exports data
- **THEN** the resulting JSON does not contain theme fields

#### Scenario: Import leaves theme unchanged

- **WHEN** the user imports data
- **THEN** the current theme settings are not modified
