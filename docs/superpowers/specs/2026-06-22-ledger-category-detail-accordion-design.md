# Ledger Category Detail Accordion

## Goal

Make category composition easier to scan without showing empty `직접 0건` controls or expanding every child category by default.

## Interaction

- Category rows without child categories keep opening the existing detail drawer.
- Category rows with child categories toggle an inline accordion when the row is pressed.
- Only one category accordion is open at a time.
- Accordion content animates height and opacity while respecting reduced-motion preferences.
- A chevron appears only on rows that have child categories.
- Expanded child rows open the existing detail drawer filtered to that child category.
- The expanded footer opens the existing detail drawer for the full parent category.

## Content

- Remove the pill-button breakdown.
- Do not render zero-count direct records.
- When direct records exist, show them as `<부모 카테고리>로 기록`.
- Each breakdown row shows its amount and `부모 지출의 N% · N건`.
- A subtle inset border communicates hierarchy without adding another card.
- Parent rows show amount and count without a progress bar because the pie chart already communicates category share.
- The detail drawer uses the known entry count for its loading skeleton, capped at five visible rows.

## Scope

- Reuse the current API response and detail drawer.
- Keep the current category icon, total amount, and total count.
- Do not change aggregation logic, charts, colors, typography, or database schema.

## Verification

- Rows with children expose accordion state and toggle it.
- Rows without children still open the detail drawer directly.
- Zero direct counts are absent.
- Child and parent detail actions retain their existing filter parameters.
