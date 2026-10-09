## ADDED Requirements

### Requirement: Shared accordion primitive

The system SHALL provide a shadcn-generated Base UI Accordion in `src/shared/ui/`, re-exported from `@/shared/ui`. It SHALL provide accessible triggers, independently expandable panels, animated panel height and chevron rotation, and reduced-motion overrides.

#### Scenario: Feature uses an accordion

- **WHEN** a feature imports Accordion, AccordionItem, AccordionTrigger, and AccordionContent from `@/shared/ui`
- **THEN** those exports resolve to the shared shadcn Base UI wrapper
- **AND** reduced-motion users receive expansion without animation
