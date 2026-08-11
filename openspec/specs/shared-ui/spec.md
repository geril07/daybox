# Shared UI

## Purpose

Defines the shared UI component layer — shadcn v4 wrappers around `@base-ui/react` primitives housed in `src/shared/ui/`. Governs how components are added, styled, themed, and consumed across all features.

## Requirements

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

The following shadcn-derived components SHALL be available in `src/shared/ui/` and re-exported from the `@/shared/ui` barrel:

| Component     | Purpose                                                          |
| ------------- | ---------------------------------------------------------------- |
| Button        | Styled button with variant prop                                  |
| Select        | Dropdown selection (compound)                                    |
| Sheet         | Slide-in panel (compound)                                        |
| Switch        | Toggle switch                                                    |
| Slider        | Range slider                                                     |
| AlertDialog   | Modal confirmation dialog (compound)                             |
| Popover       | Floating anchored layer (compound)                               |
| Menu          | Dropdown menu (compound)                                         |
| Tabs          | Tabbed navigation (compound)                                     |
| NumberInput   | Numeric input with increment/decrement controls                  |
| EmptyState    | Contextual empty-state placeholder                               |
| LinkifiedText | Renders text with auto-detected URLs as clickable external links |

#### Scenario: Component inventory

- **WHEN** a developer needs a shared UI primitive
- **THEN** the components listed above SHALL be present in `src/shared/ui/` and importable from `@/shared/ui`

### Requirement: LinkifiedText is a presentational shared UI component

The system SHALL provide a `LinkifiedText` component at `src/shared/ui/LinkifiedText.tsx`
re-exported from `@/shared/ui`. The component SHALL accept a single `text: string`
prop and SHALL render the string such that any `http://` or `https://` URL detected in
the text is rendered as an anchor element with `target="_blank"` and
`rel="noopener noreferrer"`. Non-URL portions of the text SHALL render as plain text
spans. The component SHALL be a pure presentational helper; it SHALL NOT manage state,
call stores, or import from `src/modules/*`.

#### Scenario: LinkifiedText is importable from the shared UI barrel

- **WHEN** a feature file imports `LinkifiedText` from `@/shared/ui`
- **THEN** the import resolves to the component at `src/shared/ui/LinkifiedText.tsx`

#### Scenario: LinkifiedText is a presentational helper

- **WHEN** the component's source is inspected
- **THEN** it imports only from `react` and from sibling files under `src/shared/`
- **AND** it does not import from `src/modules/*` or `src/app/`
- **AND** it does not call any zustand store hook

### Requirement: Shared UI component inventory includes LinkifiedText

The `Component availability` requirement's inventory table SHALL list `LinkifiedText`
as a presentational component for rendering text with auto-detected URLs as external
links.

#### Scenario: Inventory row exists for LinkifiedText

- **WHEN** a developer reads the shared-ui component inventory
- **THEN** the table contains a row whose `Component` is `LinkifiedText`
- **AND** the row's `Purpose` describes rendering text with auto-detected URLs as
  clickable external links
