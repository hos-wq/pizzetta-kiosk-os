# BASE-CMP — Foundational Universal Component Library

**Version:** 1.0.0-draft  
**Status:** CANONICAL shared grammar; unspecified variants PROPOSED

## Mandatory shared primitives
- `Icon` and icon-action surface (consistent sizing and stroke).
- `UniversalField`: one white rounded-square surface with **muted uppercase label inside** and **bold uppercase value**; editable and read-only visually coherent; one-line value auto-fit where feasible; explicit overflow policy.
- `SearchField`: UniversalField-derived search control with **Sage magnifier replacing the label**.
- `MiniUniversalField`: compact category control on Canvas with intrinsic white chips; only one category expanded at a time; Brass plus action.
- Text, numeric, currency, phone, email, multiline, select, multi-select, toggle, checkbox, radio, date, time, search and read-only variants (implement as appropriate; do not invent business semantics).
- `DateField` + `TimeField`: side-by-side 50/50 inline touch-wheel interaction in the approved composition.
- Label, badge, status indicator, button/icon-button, tab, chip, segmented selector, menu item, divider, empty/loading/error state.
- Room card, person row, task card, event card, service status card, cover, contextual section menu.
- `UniversalLightbox`: centered, white, **88vw max width and 88svh max height** (subject to responsive containment); top-right X; internal scrolling; backdrop attenuated/blurred; background scroll locked; **no nested Lightboxes**.

## Component contract template
Every component must specify:
1. Purpose and semantic role.
2. Props and controlled/uncontrolled behavior.
3. Visual anatomy (tokens, dimensions, spacing).
4. States: default, active, focused, disabled, loading, error, empty, read-only as applicable.
5. Keyboard, screen-reader and touch behavior.
6. Responsive and overflow behavior.
7. Usage examples and anti-patterns.
8. Test/demo acceptance.

## Consistency rules
- A field is never replaced by a generic browser input with unrelated geometry.
- Buttons/toggles/tabs must not alternate between pill, square and random rounded styles.
- No standalone label typography invented per module.
- Components should accept semantic variants rather than arbitrary style overrides.
- Lightbox is one system, not a collection of ad-hoc modals or bottom sheets.

## Catalog (ACCEPTANCE)
Every component displayed with interactive state controls, long/short values, phone widths, keyboard focus and touch behavior. A component is not accepted from source code or static screenshot alone.
