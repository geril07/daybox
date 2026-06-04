## ADDED Requirements

### Requirement: CLI-originated components
All shared UI components SHALL be added via `npx shadcn@latest add`, not hand-written or copied.

#### Scenario: Adding a new component
- **WHEN** a new UI component is needed
- **THEN** it SHALL be added via `npx shadcn@latest add <component>` with the `--base base` configuration active

### Requirement: Component directory
All shared UI components SHALL live in `src/shared/ui/`, imported via `@/shared/ui`.

#### Scenario: Import resolution
- **WHEN** a feature file imports a shared UI component
- **THEN** it SHALL use the path alias `@/shared/ui/<component>` or barrel `@/shared/ui`

### Requirement: Consistent component API
Each component SHALL follow shadcn conventions: `forwardRef`, `cn()` for className merging, `displayName` set, compound component pattern for complex widgets.

#### Scenario: Button usage
- **WHEN** a developer needs a styled button
- **THEN** they SHALL import `Button` from `@/shared/ui` with the appropriate `variant` prop, not a raw `<button>` element

#### Scenario: Hover styles
- **WHEN** a component needs hover/focus/active styling
- **THEN** it SHALL use Tailwind variant classes (e.g., `hover:bg-accent`) not inline `onMouseEnter`/`onMouseLeave` style mutation

### Requirement: Theme via CSS variables
The design system SHALL use shadcn's CSS variable approach: colors defined as `--color-*` in Tailwind `@theme`, mapped to semantic `--*` variables in `:root`, and consumed via Tailwind utility classes (e.g., `bg-background`, `text-foreground`).

#### Scenario: Dark mode
- **WHEN** `.dark` class is applied to `<html>`
- **THEN** CSS variable overrides in `.dark {}` SHALL update all component colours automatically without inline style changes

### Requirement: No raw element bypass
Consumer code SHALL NOT use raw `<button>`, inline `style={{}}`, or imperative hover handlers for UI that has a shadcn component equivalent.

#### Scenario: Migration compliance
- **WHEN** linting or reviewing code
- **THEN** any raw `<button>` or significant inline `style` in feature code SHALL be flagged for replacement with the appropriate shadcn component

### Requirement: Component availability
The following shadcn components SHALL be available after migration (replacing or supplementing current wrappers):

| Component | Status | Replaces |
|---|---|---|
| Button | replace | existing button.tsx |
| Select | replace | existing select-menu.tsx |
| Sheet | replace | existing side-panel.tsx |
| Switch | replace | existing toggle.tsx |
| Slider | replace | existing range-slider.tsx |
| AlertDialog | replace | existing alert-dialog.tsx |
| Popover | replace | existing popover-card.tsx |
| Input | add | none |
| Label | add | none |
| Separator | add | none |
| Badge | add | none |
| Card | add | none |
| Tabs | add | none |

#### Scenario: Component inventory
- **WHEN** the migration is complete
- **THEN** all components in the table above SHALL be present in `src/shared/ui/`
- **THEN** old wrappers not in the table SHALL be removed
