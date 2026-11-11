# INT-01 — Interaction, Touch & Accessibility

**Version:** 1.0.0-draft  
**Status:** CANONICAL behavior where defined; accessibility implementation PROPOSED

## Core behavior
- Touch-first interaction without sacrificing keyboard and screen-reader operation.
- Avoid hover-only controls, tiny tap targets and accidental nested scrolling.
- No modal-on-modal. One expanded MiniUniversalField category at a time.
- Universal Lightbox traps focus appropriately, closes via X and Escape where safe, restores focus, and prevents background scroll.
- Date and Time use inline touch wheels with accessible selection semantics and a predictable confirmation model.
- Section footer state and navigation context remain consistent across routes.
- Do not show inert controls as operational. In a prototype, actions must be labeled **DEMO / FIXTURE** where not backed by persistence.

## Interaction state model
Every control must visibly differentiate disabled, error, selected and loading states. Async actions must not falsely report success. No fake network progress indicators.

## Accessibility acceptance
- Semantic roles and accessible names for icon-only controls.
- Keyboard operation and visible focus indicator.
- Contrast evaluated for text, glyphs and meaningful status colors.
- Reduced-motion preference respected.
- Screen-reader labeling for fields, tabs, Lightbox and date/time selectors.
- Screen-size, zoom and safe-area checks on iPhone-class viewport.

## Demonstration
Provide a reproducible checklist and browser interactions for keyboard, touch, scrolling, orientation, keyboard-open, long content and no-data states.
