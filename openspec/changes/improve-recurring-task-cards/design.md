## Context

Settings is a narrow drawer. Recurring editors currently wrap weekdays, hide the meaning of the estimate, and omit group color and action descriptions. Existing Settings help uses Base UI tooltips and an Info icon.

## Goals / Non-Goals

**Goals:** Clear English labels, visible control meaning, predictable narrow layouts, and visual evidence in the PR.

**Non-Goals:** Changing recurrence rules, stored series terminology, global tooltip behavior, or other Settings sections.

## Decisions

- Keep the existing components; use recurring-task terminology only in user-facing labels, including deletion confirmation.
- Place the section help button after the label, not inside the accordion button, to avoid nested interactive controls. The shared accordion trigger accepts a sibling header action; a three-column grid and subgrid align the label, help, and trailing chevron without fixed offsets. Other accordion headers retain their existing layout.
- Set `disableHoverablePopup` on these tooltips only and keep keyboard-focus support. Use existing TooltipTrigger render composition for actions.
- Increase the Settings drawer to 380px, capped at the viewport width. Use seven equal-width weekday columns with unchanged readable text and 32px-high controls rather than wrapping one day.
- Place Group and Estimated pomodoros labels above their controls. Use a flexible group column and fixed estimate column on desktop; stack on mobile.
- Truncate long selected group names without truncating their accessible name. Keep the color dot and dropdown indicator visible. The existing picker exposes the full name.
- Bound the group picker's popup to its available width and wrap option names. Browser verification exposed overflow at 320px; fix the group picker itself rather than add a card-specific workaround.
- Keep titles as single-line editable inputs, preserving the existing edit interaction and length limit.

## Risks / Trade-offs

- More labels add height → gain clarity and verify scrolling and mobile screenshots.
- Long selected names truncate → retain full accessible names and show full text in the picker.
- Narrow widths could crowd weekdays → verify 320px and 390px viewports; no reduced text size or accidental wrapping.
- Tooltip content cannot be hovered → intentional user preference, restricted to this feature.
