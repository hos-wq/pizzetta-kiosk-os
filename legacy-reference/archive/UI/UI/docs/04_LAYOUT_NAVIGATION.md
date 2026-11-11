# BASE-LAY — Foundational Shell, Navigation, Covers & Responsive Layout

**Version:** 1.0.0-draft  
**Status:** CANONICAL shell principles; exact cover/menu content pending reference validation

## Mobile app shell (CANONICAL)
- iPhone-first, full viewport height using dynamic viewport units where appropriate.
- Respect top and bottom safe-area insets.
- **No traditional global header** with logo/profile, no generic "OPERATIONS" eyebrow, no repeated large page titles/subtitles.
- The five footer environments are distinct operating areas, each with its own **cover** and **contextual menu**. Cover and menu must not be omitted or substituted by a generic title block.
- Footer: **five equal independent icon-only tiles**, in order:
  1. LISTING
  2. PEOPLE
  3. DASHBOARD
  4. CALENDAR
  5. SERVICES
- Selected tile Mustard `#D1A72C` with white icon; inactive tiles white with Charcoal icons.
- Footer persists across environments; no legacy Rooms/Leads/More labels.

## Covers and section menus
Each environment requires an intentional cover/entry composition and a contextual menu exposing that section's actions or subareas. Exact cover artwork, menu content, iconography and layout must be reconciled against owner-approved mockups. **UNKNOWN until supplied**; agent must not fabricate an approved design.

## Responsive contract
- Fluid width, no fixed-width input that clips its content.
- Component grids respond to available container width, not only viewport breakpoints.
- Listing: compact two-column cards on the approved phone target; fallback on very narrow widths only if necessary for legibility.
- Consistent gaps, vertical rhythm, touch targets, scroll containment.
- Lightbox, footer and section content must not collide with safe areas or keyboard.
- No horizontal overflow of ordinary page content; only explicitly designed horizontal scrollers.

## Demonstration (ACCEPTANCE)
Show live layout at 320, 375, 390, 430, 768 and 1280 CSS px, including landscape and software keyboard cases where feasible. Test long labels, localization-length text and zoom. Demonstrate all five cover/menu combinations on phone-sized viewport.
