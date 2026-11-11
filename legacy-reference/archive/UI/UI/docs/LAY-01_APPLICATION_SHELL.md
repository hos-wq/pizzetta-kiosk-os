# LAY-01 — Application Shell, Covers, Contextual Menus & Responsive Grid

**Project:** BR OS Design System  
**Contract ID:** LAY-01  
**Version:** 1.0.0  
**Status:** REVIEW CANDIDATE — not implementation authorization  
**Authority:** BR OS project owner  
**Dependencies:** `01_GOVERNANCE.md`, CDE-01 Controlled Design Evolution, `VIS-01_VISUAL_FOUNDATION.md`, `03_VISUAL_TOKENS.md`, `04_LAYOUT_NAVIGATION.md`, `05_COMPONENT_LIBRARY.md`, `07_MODULE_CONTRACTS.md`, `09_ACCEPTANCE_GATES.md`  
**Scope:** Frontend-only design system and demonstrator; no production API integration.

---

## 00. Purpose and authority

LAY-01 specifies the **application composition contract**, not merely page styling. BR OS is a smartphone-first operational web app that must behave and read visually like a compact, professional native mobile application. The application shell, section covers, contextual navigation, footer, and responsive grids are reusable infrastructure shared by all five modules.

**Normative keywords:** MUST / MUST NOT are binding; SHOULD expresses a strong preference subject to demonstrable improvement; MAY is optional. All proposed deviations follow CDE-01. In case of contradiction, stop and record a contract conflict; do not silently select a rule.

**Source of truth:** approved interactive mockups and canonical design decisions determine the concept. This document codifies known decisions; it does not pretend to specify mockup details not currently available. Any unresolved cover/menu geometry remains PROPOSED until owner review.

## 01. Non-negotiable application concept [CANONICAL]

1. Five primary environments, in this order: **LISTING · PEOPLE · DASHBOARD · CALENDAR · SERVICES**.
2. Primary navigation is **icon-first**: five independent, equal-width, square-like footer tiles, icons only; no permanent text captions beneath the icons.
3. No conventional persistent top header: no oversized logo bar, profile bar, repeated page title, generic subtitle, or legacy page chrome.
4. Each primary environment MUST expose its own identifiable **section cover** and **contextual menu**. They are operational entry points, not decorative banners.
5. Content uses compact, adaptive grids and meaningful information density. Avoid large empty panels, full-width desktop cards stacked by default, and redundant titles.
6. Components derive from shared visual tokens and reusable primitives, not screen-specific CSS imitation.
7. UniversalField, SearchField, Universal Lightbox, and shared interaction states are governed by their component contracts and VIS-01.
8. Preserve the approved BR OS color semantics. Aesthetic modernization is not permission to remap roles.
9. Demonstrator must be fully navigable with **fixture data** while remaining independent of the existing backend.
10. The existing application and its CSS MUST NOT be imported into the new design-system project.

## 02. Structural anatomy [CANONICAL]

The application has one top-level shell and five module surfaces:

```text
AppViewport (100dvw × dynamic viewport)
└── AppShell
    ├── MainRegion (scroll container)
    │   └── ActiveModule
    │       ├── ModuleCover
    │       ├── ModuleContextMenu
    │       └── ModuleContent (adaptive composition)
    ├── GlobalOverlayHost (Universal Lightbox)
    └── PrimaryFooter (5 equal icon tiles)
```

The diagram describes responsibility, not a mandatory DOM hierarchy. Avoid duplicate independent scroll regions unless explicitly justified. Overlays must not be clipped by scrolling ancestors. Safe-area treatment is required on supported iPhones.

### 02.1 Shell responsibilities

- Own active primary module, persistent footer, safe-area insets, scroll restoration policy, and global overlay host.
- Provide consistent module mounting, keyboard focus management, and accessible navigation labels.
- Avoid legacy shell wrappers and duplicated module titles.
- Handle viewport changes from address bars, orientation, zoom, and on-screen keyboard without obscuring critical controls.
- Make fixture mode conspicuous to reviewers without polluting the approved application visual composition (e.g., a separate developer-only toggle or environment indicator).

### 02.2 Module responsibilities

Each module provides its own cover metadata, contextual actions, content composition, and empty/loading/error states. It MUST NOT independently recreate the footer, global overlay, or universal field styles.

## 03. Primary footer [CANONICAL]

### 03.1 Identity and geometry

- Exactly five tiles: LISTING, PEOPLE, DASHBOARD, CALENDAR, SERVICES, in canonical order.
- Five equal columns; each tile has the same width and height behavior. Icon-only visible treatment.
- Selected tile uses **Mustard `#D1A72C`** background and white icon; inactive tiles use white background and **Charcoal `#292622`** icons.
- Flat presentation, no gradients, elevated shadows, oversized active tile, or pill-shaped floating dock.
- Tiles use small, consistent rounded-square corners, subject to VIS-01 tokens.
- Footer remains visually and functionally stable across all modules.
- Respect `env(safe-area-inset-bottom)` without creating an oversized blank strip.
- Footer iconography must be semantically legible and visually consistent in weight, optical size, and stroke.

### 03.2 Interaction

- Touching a tile switches the active environment in one action; current tile exposes `aria-current="page"` or equivalent.
- Each icon-only control MUST have a programmatic accessible name.
- Footer remains reachable with keyboard and screen readers.
- State changes are immediate in fixture mode; no navigation to dead-end placeholder pages.
- When an overlay is active, its focus and scroll-lock contract takes precedence over footer interaction.

### 03.3 Responsive behavior

The footer distributes available width equally without horizontal overflow. Do not solve narrow widths by shrinking icons to illegibility or adding visible labels. If a proposed breakpoint treatment differs from the canonical five-tile layout, classify it as a CONCEPT CHANGE and request approval.

## 04. Section covers [CANONICAL concept; PROPOSED detailed anatomy]

A **cover** is the compact, immediately recognizable opening surface of a module. It establishes module identity and provides context or a useful primary action without recreating a traditional page header.

### 04.1 Required behavior [CANONICAL]

- Each of the five modules has a dedicated cover component or dedicated cover configuration.
- Covers are integrated with the module's workflow, not generic hero banners.
- No redundant large module title plus descriptive marketing subtitle.
- Covers must fit the mobile density strategy and coexist with contextual menus.
- Covers must preserve usable content above the fold on an iPhone-sized viewport.

### 04.2 Candidate anatomy [PROPOSED — visual approval required]

A cover may include a compact semantic icon, short operational status, key metric, or one high-value action. Its exact arrangement, proportions, labels, and per-module content MUST be compared with approved mockups before implementation. Do not infer that all covers must look identical or occupy identical height.

### 04.3 Five cover contracts

| Module | Canonical operational purpose | Cover detail status |
|---|---|---|
| LISTING | Fast overview and entry to 10 room records | PROPOSED geometry/content pending mockup comparison |
| PEOPLE | Search, identify, create and open person dossiers | PROPOSED geometry/content pending mockup comparison |
| DASHBOARD | Surface actionable Messages, Maintenance, Housekeeping | PROPOSED geometry/content pending mockup comparison |
| CALENDAR | Immediate temporal context and day/event navigation | PROPOSED geometry/content pending mockup comparison |
| SERVICES | Operational task creation, triage and status navigation | PROPOSED geometry/content pending mockup comparison |

## 05. Contextual menus [CANONICAL concept; PROPOSED exact contents]

1. Every module MUST have a visible, discoverable contextual menu associated with its cover/content.
2. Contextual menus expose **module-specific operations**, not a duplicate of the five-item footer.
3. Prefer icon-led controls, compact labels only where meaning cannot be communicated reliably by an icon, and consistent selected/disabled/attention states.
4. Menus must remain usable with touch and keyboard; icon-only actions require accessible names and, where useful, discoverable tooltips or secondary explanations.
5. The menu's exact action set, icon mapping, layout, and placement require comparison with the approved mockups. No generic hamburger menu as an unapproved substitute.
6. If horizontal space is insufficient, use an approved responsive composition (wrap, adaptive grid, or controlled overflow) rather than truncating actions invisibly.
7. Do not introduce nested navigation layers without a documented operational need.

## 06. Responsive grid system [CANONICAL]

### 06.1 Principle

**Content adapts to available width; the viewport must not be forced to accommodate fixed-width content.** Mobile-first does not mean single-column by default. Use compact multi-column layouts when information hierarchy and touch ergonomics support them.

### 06.2 Grid primitives

- Provide reusable `AdaptiveGrid`, `EqualGrid`, `CompactCardGrid`, `InlineFieldGrid`, and `ActionGrid` (names illustrative, API may vary).
- Support intrinsic sizing via CSS Grid (`minmax`, `min`, `max`, `clamp`, `auto-fit` / `auto-fill`) where appropriate.
- Prevent content-driven horizontal overflow using `min-width: 0`, wrapping rules, and robust text fitting.
- Do not hardcode screen widths or assume one iPhone model.
- Keep gutters, spacing, and card radii driven by shared tokens.
- Use container queries when component width matters more than viewport width; media queries remain appropriate for shell-level layout.
- Components should remain legible at browser text enlargement and not rely on clipping critical values.

### 06.3 Canonical compositions

- **LISTING:** compact **two-column** grid of ten room cards on the target iPhone presentation, with four aligned information rows per card: room/occupancy; maintenance; housekeeping; next date. Card layout must be validated at narrow widths; do not silently reduce to one column on target iPhone without approval.
- **DASHBOARD:** three operational categories, MESSAGES / MAINTENANCE / HOUSEKEEPING, with compact tile treatment and **two-column** task/event card composition where applicable.
- **CALENDAR:** five visible date rows and horizontal traversal across consecutive dates; selected TODAY Mustard, workload Amaranto, weekend inner squares 20% smaller per established concept. Exact density and interaction governed by Calendar contract.
- **PEOPLE:** compact search/create controls and person rows, with dossier opened through Universal Lightbox rather than embedding a full desktop record editor in the page.
- **SERVICES:** compact shared task cards and contextual task actions; task schema and filters governed by module contract.

### 06.4 Adaptive rules [PROPOSED implementation thresholds]

Do not freeze arbitrary breakpoint pixel values in this contract. The agent should propose breakpoint/container thresholds based on content stress tests, demonstrate at representative widths, and record decisions. The required **outcome** (density, no overflow, readable controls, correct card columns on target iPhone) is CANONICAL; numerical breakpoints are PROPOSED.

## 07. Vertical economy and viewport behavior [CANONICAL]

- Content should begin promptly after compact cover/menu composition, without oversized whitespace.
- Persistent footer must not cover scrollable content; reserve the correct inset.
- Prefer dynamic viewport units (`dvh`/`svh`) and safe-area insets over fragile fixed `100vh` assumptions.
- Keep a single primary scroll model; preserve expected scrolling when switching modules according to documented policy.
- Inputs and bottom controls must remain accessible with the software keyboard open.
- Do not make decorative headers sticky or introduce fixed bars that compete with the footer.
- Avoid layout shift when fonts load, error states appear, or data counts change.

## 08. Shared component composition [CANONICAL]

### 08.1 UniversalField

- One compact white rounded-square surface containing a muted uppercase label **inside** the control and a bold uppercase value.
- Editable and read-only states preserve the same visual grammar.
- Single-line value fitting is preferred; no destructive clipping of essential information.
- Date and Time controls may compose as 50/50 inline fields with touch-friendly wheels according to the component contract.
- SearchField uses a sage magnifier icon in place of the standard label.

### 08.2 Universal Lightbox

- Centered white surface, target maximum width **88vw** and maximum height **88svh**, close control at top right.
- Internal content scrolling; background visually attenuated and locked against scrolling.
- No nested lightboxes or fallback bottom sheets that silently alter the canonical interaction.
- Accessible focus entry, containment, escape/close behavior and focus return.

### 08.3 Semantic visuals

Use VIS-01 as token authority: Canvas `#F7F5F1`, white `#FFFFFF`, Charcoal `#292622`, Ancient Brass `#A98552`, Mocha `#765744`, Sage `#8F9A7A`, Amaranto `#8B1830`, Mustard `#D1A72C`, muted `#81796F`. Colors have semantic roles; avoid arbitrary one-off substitutions. Flat UI, no unapproved gradients, drop shadows, large pills, or ornamental framing.

## 09. Interaction and navigation states [CANONICAL]

Every module must demonstrate these states with fixture data where relevant: default, selected, hover/focus-visible, pressed, disabled, loading, empty, error, attention/urgent, and open overlay. States must remain visually consistent and accessible.

- Switching modules must not unexpectedly destroy unsaved input; any discard policy must be explicit.
- Actions that open dossiers, rooms, day records, or tasks should use the agreed overlay model.
- Error messaging should be contextual and actionable; never expose local-development instructions (e.g., “start the local Worker”) in a production-like demonstrator.
- Do not simulate backend success as if it were persistent production data. Fixture mutations must be clearly limited to demo state.

## 10. Accessibility and native-app quality [CANONICAL]

- Semantic navigation landmarks and accessible names for all icon-only controls.
- Visible keyboard focus, logical tab order, and screen-reader state announcements where relevant.
- Touch targets sized for reliable interaction; compact appearance must not create unusably small hit areas. Exact target sizing follows VIS-01/accessibility contract.
- Support reduced-motion preference; avoid animation as the only state indicator.
- Respect text scaling, color contrast, orientation changes, and iPhone safe areas.
- Smooth interaction without scroll trapping, nested modal dead ends, or horizontal body overflow.

## 11. Demo and inspection requirements [CANONICAL]

The first deliverable is a **standalone, runnable visual demonstrator** using fixture data only. It must expose:

1. Five navigable modules with real section covers and contextual menus.
2. Persistent five-tile footer with correct selected state.
3. Representative compact grid compositions for all modules.
4. A component gallery demonstrating cover, menu, footer, field, card, Lightbox, and responsive variants.
5. Fixture interactions that can be exercised, including switching modules, opening/closing overlays, editing sample fields, and selecting dates/tasks.
6. A responsive inspection view or documented screenshots at representative narrow/standard/wide phone widths and desktop widths.
7. A clear list of PROPOSED design variants awaiting owner approval.

No Worker, D1, OAuth, production credentials, or external service is required to demonstrate LAY-01.

## 12. Acceptance gates [ACCEPTANCE]

**A01 — Structural integrity:** no traditional header, duplicate titles, or legacy chrome anywhere in the demonstrator.

**A02 — Five-module navigation:** all footer tiles work, are equal-sized, icon-only, and selected styling uses the approved Mustard/white combination.

**A03 — Covers:** each module has a distinct functional cover; no generic banner substituted for all five.

**A04 — Contextual menus:** each module exposes usable context-specific controls; menu is not missing or replaced by the footer.

**A05 — Width adaptation:** no body-level horizontal overflow or truncated essential controls at the approved target viewport widths; two-column Listing card composition survives target iPhone validation.

**A06 — Vertical density:** no gratuitous page chrome, giant blank panels, or desktop-style full-page forms.

**A07 — Shared composition:** labels are integrated inside UniversalField; SearchField, cards, Lightbox, and semantic colors are consistent.

**A08 — Calendar:** five-row consecutive-date concept, Today/Amaranto semantics and weekend sizing demonstrated.

**A09 — Interaction:** fixture navigation and overlays operate correctly by touch, mouse, and keyboard.

**A10 — Evidence:** browser screenshots/video or live URL for each module and component gallery; automated tests alone are insufficient.

**A11 — Isolation:** no imports from legacy frontend, no backend dependency, no production deployment or mutation.

**A12 — Owner approval:** a passing build does not constitute visual approval. Gate remains open until owner explicitly accepts the demonstrated result.

## 13. Failure conditions [CANONICAL]

Any of the following is a blocking failure, not a minor polish item:

- Old BR logo/header/profile/title/subtitle shell persists.
- Five footer icons exist but their modules lack covers or contextual menus.
- Generic desktop cards replace compact approved grids.
- Footer selected tile changes size or uses wrong semantics.
- UniversalField is replaced by conventional external-label form rows.
- Listing cards disappear due to API errors in fixture mode.
- Calendar presents duplicate headers or a conventional page layout instead of its date matrix.
- The UI relies on legacy CSS, or a CSS override chain masks unresolved architecture.
- Agent claims completion without visual demonstration.

## 14. Controlled Design Evolution [CANONICAL]

Per CDE-01, distinguish:

- **REFINEMENT:** improvement within established behavior; document rationale and evidence.
- **DESIGN VARIANT:** visible change to geometry/interaction; show side-by-side baseline and proposed design, request owner approval.
- **CONCEPT CHANGE:** alteration to icon-first navigation, headerless shell, five-module model, universal components, or semantic system; stop and request explicit authorization.

A proposed solution must improve operational usability, information density, accessibility, responsiveness, or consistency. Implementation convenience alone is not sufficient.

## 15. Open decisions / evidence register [PROPOSED]

| ID | Open item | Required evidence | Approval owner |
|---|---|---|---|
| LAY-D01 | Exact per-module cover composition | Approved interactive mockups / side-by-side proposal | Project owner |
| LAY-D02 | Exact contextual menu items, icon assignments and placement | Mockups + operational action map | Project owner |
| LAY-D03 | Font family, sizes, optical icon set where VIS-01 leaves options | Token specimen and device screenshots | Project owner |
| LAY-D04 | Container thresholds for adaptive grids | Narrow/standard/wide viewport stress tests | Project owner |
| LAY-D05 | Module switch scroll preservation and draft state policy | Interactive prototype | Project owner |
| LAY-D06 | Safe-area and software keyboard behavior on target iPhone | Real-device test | Project owner |

**No agent may mark an open decision CANONICAL without explicit owner approval.**

## 16. Implementation handoff boundary

Once approved, LAY-01 authorizes only the designated **frontend shell/component demonstration gate**. It does not authorize rewriting the legacy app, importing old styles, connecting APIs, running database migrations, configuring OAuth, or deploying to production. An execution prompt must identify the exact gate, writable directory, permitted files, and required visual evidence.

---

**End of LAY-01 v1.0.0 — REVIEW CANDIDATE**
