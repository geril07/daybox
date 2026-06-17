# App Shell — Delta Spec

## ADDED Requirements

### Requirement: Internal scroll container

The app shell SHALL constrain itself to the viewport height and SHALL NOT rely on document-level scrolling. Only the main content area (`<main>`) SHALL be scrollable, using `overflow-y: auto`.

#### Scenario: App shell is viewport-bound

- **WHEN** the app renders
- **THEN** the root `.app-shell` element has `height: 100dvh` (via Tailwind `h-dvh`)
- **AND** the root `.app-shell` element has `overflow: hidden`
- **AND** the document `<body>` does not produce a scrollbar

#### Scenario: Only main content scrolls

- **WHEN** content exceeds the available space between the header and TimerBar
- **THEN** only the `<main>` element produces a scrollbar
- **AND** the header remains fixed at the top
- **AND** the TimerBar remains fixed at the bottom
- **AND** no `position: sticky` is used on header or TimerBar

#### Scenario: Scrollbar gutter is stable

- **WHEN** content is short enough that no scroll is needed
- **THEN** the `<main>` element reserves space for the scrollbar via `scrollbar-gutter: stable`
- **AND** the layout does not shift horizontally when switching between views of different content lengths

### Requirement: Flex layout for fixed header and footer

The shell SHALL use a vertical flex layout where the header and TimerBar are flex children (`flex-shrink-0`) and the middle row (`flex-1 min-h-0`) contains the scrollable content area.

#### Scenario: Header and TimerBar never scroll

- **WHEN** the user scrolls the main content area
- **THEN** the header stays visible at the top of the viewport
- **AND** the TimerBar stays visible at the bottom of the viewport
- **AND** neither header nor TimerBar moves

#### Scenario: Content row allows child to shrink

- **WHEN** the content row contains the sidebar and scrollable main area
- **THEN** the row container has `min-height: 0` (via Tailwind `min-h-0`)
- **AND** the `<main>` element can shrink below its intrinsic content height to enable internal scrolling
