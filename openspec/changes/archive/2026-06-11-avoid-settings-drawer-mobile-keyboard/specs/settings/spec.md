## ADDED Requirements

### Requirement: Settings drawer avoids initial editable focus

The system SHALL move focus inside the Settings drawer when it opens without initially focusing a text-editing or numeric input.

#### Scenario: Open settings drawer on mobile

- **WHEN** the user opens the Settings drawer on a mobile viewport
- **THEN** focus is placed inside the drawer without activating the first timer duration input
- **THEN** the virtual keyboard remains closed until the user explicitly focuses an editable input

#### Scenario: Keyboard navigation after drawer open

- **WHEN** the Settings drawer has opened with focus on the drawer surface
- **THEN** pressing Tab moves focus to the drawer's interactive controls
- **THEN** focus remains constrained to the open drawer until it is closed
