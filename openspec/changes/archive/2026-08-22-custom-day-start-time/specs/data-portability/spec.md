## ADDED Requirements

### Requirement: The planner save slice includes the day-start preference

The planner save slice SHALL export and import `dayStartMinutes` together with `weekStartDay` and `browseDate`. New planner save data SHALL use the next planner-slice version and SHALL validate `dayStartMinutes` as an integer from `0` through `1439`.

#### Scenario: Export includes the configured boundary

- **WHEN** the user has configured a day start of 02:30
- **AND** a current snapshot is built
- **THEN** `slices.planner.dayStartMinutes` is `150`
- **AND** the snapshot continues to include the existing planner preferences

#### Scenario: Import restores the configured boundary

- **WHEN** the user imports a valid current snapshot whose planner slice has `dayStartMinutes = 150`
- **THEN** the prepared planner slice contains `dayStartMinutes = 150`
- **AND** after commit the planner uses 02:30 as its day boundary

#### Scenario: Invalid day-start values reject the import

- **WHEN** a current snapshot contains a planner slice with `dayStartMinutes = 150.5`, `-1`, or `1440`
- **THEN** snapshot preparation fails
- **AND** no planner preference is modified

### Requirement: Older planner save data defaults the day-start preference

The planner save slice SHALL migrate its previous version by adding `dayStartMinutes = 0`. A current envelope missing the planner slice SHALL use the planner slice's current default, including `dayStartMinutes = 0`, according to the existing missing-slice policy.

#### Scenario: Version-one planner data remains importable

- **WHEN** a snapshot contains a valid version-one planner slice with `weekStartDay` and `browseDate` but no `dayStartMinutes`
- **THEN** preparation migrates it to the current planner-slice version
- **AND** the prepared value has `dayStartMinutes = 0`
- **AND** the existing `weekStartDay` and `browseDate` are preserved

#### Scenario: Missing planner slice uses midnight

- **WHEN** a current envelope omits `slices.planner`
- **THEN** preparation uses a valid default planner slice
- **AND** that slice has `dayStartMinutes = 0`
