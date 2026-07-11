## ADDED Requirements

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
