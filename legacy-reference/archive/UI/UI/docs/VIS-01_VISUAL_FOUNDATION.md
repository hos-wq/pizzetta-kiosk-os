# VIS-01 — Visual Foundation & Design Token Contract

**Project:** BR OS Design System  
**Contract ID:** VIS-01  
**Version:** 1.0.0 — review candidate  
**Date:** 2026-10-12  
**Status:** CANONICAL for previously approved principles and colors; PROPOSED for implementation defaults; OPEN for reference-dependent decisions  
**Target location:** `D:\Boutique rooms\br-os-design-system\docs\VIS-01_VISUAL_FOUNDATION.md`  
**Dependencies:** `01_GOVERNANCE.md` (GOV-01), `03_VISUAL_TOKENS.md`, `04_LAYOUT_NAVIGATION.md` (LAY-01), `05_COMPONENT_LIBRARY.md` (CMP-01), `06_INTERACTION_ACCESSIBILITY.md` (INT-01), `09_ACCEPTANCE_GATES.md` (QUA-01), `11_DECISION_REGISTER.md`, CDE-01.

---

## 0. Contract authority and interpretation

### 0.1 Purpose

Define a single, reusable visual grammar for a **mobile-first operational web application that feels like a purpose-built smartphone app**, rather than a shrunken desktop website. The system must support dense information, immediate recognition, efficient touch interactions, consistent labels, adaptive grids, and a distinctive BR OS identity.

**This contract governs the visual foundation, not backend logic or individual module workflows.** The component, shell and module contracts govern their respective behavior and compositions.

### 0.2 Normative vocabulary

- **CANONICAL:** already approved; implement as specified unless the owner explicitly approves a change.
- **PROPOSED:** professionally reasoned default; must be shown in the visual catalog and accepted before being frozen.
- **OPEN:** source evidence or owner decision is missing; do not silently treat a proposal as approved.
- **MUST / MUST NOT:** mandatory compliance.
- **SHOULD:** preferred, with documented reason for exception.

### 0.3 Controlled design evolution — CDE-01

Preserve the concept, improve its execution. A refinement that preserves canonical interaction may be proposed and demonstrated. A visible design variant needs explicit owner approval before replacing the baseline. A concept change requires a formal change request and approval. **Cleaner code, fewer components, or conventional UI patterns are not sufficient evidence of a better design.**

### 0.4 Source precedence and conflict handling

1. Explicit owner-approved concept and later approved contract amendments.
2. Approved interactive mockups **when actually provided to the implementation agent**.
3. CANONICAL rules in this contract and related contracts.
4. PROPOSED technical defaults, subject to review.

If two canonical sources conflict, stop, record the conflict, and request a decision. Do not claim to have examined mockups that are not available. Never import styling or layout from the legacy application as an implicit authority.

---

## 1. Product visual thesis — CANONICAL

BR OS is a **compact, precise, tactile, high-information-density operations interface** for a smartphone. The visual system must favor operational signal over decoration.

1. **Icon-first, not title-first.** Icons identify navigation, actions, states and categories. A traditional persistent logo/profile header, large page titles, generic subtitles and decorative eyebrows MUST NOT be introduced.
2. **Five distinct operational environments.** LISTING, PEOPLE, DASHBOARD, CALENDAR and SERVICES each require a recognizable cover/entry treatment and contextual menu; these cannot be replaced with generic heading blocks. Exact cover/menu compositions remain OPEN until the approved references are supplied.
3. **Responsive composition, not desktop shrinkage.** Containers, fields, text and grids respond to available width. No arbitrary fixed widths that truncate essential information or cause unintended horizontal scrolling.
4. **One visual language.** Fields, labels, cards, chips, toggles, navigation and modal surfaces derive from shared primitives and tokens, not page-specific CSS improvisation.
5. **Semantic color.** Colors indicate function, identity or state, not decoration. Color alone must not be the sole carrier of critical meaning.
6. **Flat and restrained.** No gradients, drop shadows, pill-shaped controls or ornamental borders by default. Use small-radius rounded-square geometry where appropriate.
7. **Compact without being cramped.** High density must coexist with readable values, accessible focus, and practical touch targets.
8. **Visual truthfulness.** Fixture-only prototype interactions must be clearly distinguishable from real persisted operations; no false success feedback.

---

## 2. Canonical color system

The following values are **locked source values** from the existing BR OS contract. Do not alter them for aesthetic convenience.

| Token | Hex | Canonical role |
|---|---|---|
| `canvas` | `#F7F5F1` | Main application canvas |
| `surface` | `#FFFFFF` | Cards, fields, Lightbox |
| `charcoal` | `#292622` | Primary text, inactive icons |
| `active-text` | `#FAF8F3` | Text/glyphs on active controls |
| `brass` | `#A98552` | Active and selected controls |
| `mocha` | `#765744` | Room identity labels |
| `sage` | `#8F9A7A` | Square icon backgrounds, white glyph |
| `amaranto` | `#8B1830` | Calendar workload and date/time labels |
| `mustard` | `#D1A72C` | TODAY, selected footer tile, attention badge |
| `muted` | `#81796F` | Secondary labels and supporting text |
| `pending` | `#F4C430` | Pending state |
| `urgent` | `#D92D3F` | Urgent/failed state |
| `confirmed` | `#168B60` | Confirmed/OK state |

### 2.1 Semantic usage — CANONICAL

- The **selected footer tile** uses Mustard background with a white glyph; inactive tiles are white with Charcoal glyphs.
- **TODAY** uses Mustard; calendar workload uses Amaranto.
- Room identity uses Mocha; general selected/active controls use Brass.
- Sage icon surfaces use white glyphs.
- UniversalField labels use muted text; values use Charcoal, with visual hierarchy determined by the field contract.
- Do not swap Brass, Mustard, Sage and Amaranto merely because they look interchangeable.

### 2.2 Contrast exception protocol — CANONICAL constraint / PROPOSED remedy

Some canonical color-on-white or white-on-color pairings may not meet accessible contrast for **small text or fine-stroke icons**. The implementing agent MUST measure actual contrast in the catalog. Preserve the locked base hex values; if a pairing fails, propose a **documented semantic on-color token, stronger stroke, larger glyph, non-color indicator, or approved alternative**. Do not quietly replace canonical colors. Required contrast targets: WCAG 2.2 AA where applicable (4.5:1 for normal text, 3:1 for large text and essential non-text UI boundaries).

### 2.3 Token governance

- Raw palette values are declared **once** in a source-of-truth token file.
- Components consume semantic aliases; they MUST NOT scatter raw hex literals.
- Add derived tokens for focus, divider, disabled, overlay and hover **only as PROPOSED** with a documented use case and accessibility validation.
- Dark mode is **OUT OF SCOPE** until separately approved. No unrequested dark theme.

---

## 3. Tailwind CSS v4 architecture — ACCEPTANCE requirement

Use Tailwind CSS **v4** with CSS-first configuration, theme tokens and utilities. Do not carry over the old project's CSS cascade, V2 overrides or Tailwind v3 configuration conventions.

### 3.1 Recommended structure — PROPOSED

```text
src/
  styles/
    tokens.css         # Canonical palette + semantic custom properties
    theme.css          # Tailwind v4 @theme inline mapping
    base.css           # Reset and app-wide foundations only
    utilities.css      # Small documented app-specific utilities, if needed
  design-system/
    primitives/
    components/
    patterns/
  catalog/
```

Use a single documented CSS import entry and deterministic cascade order. Avoid `!important`, page-level overrides of primitive internals, or duplicated token definitions.

### 3.2 Illustrative implementation — PROPOSED, not pre-approved code

```css
/* tokens.css — single palette source */
:root {
  --br-canvas: #F7F5F1;
  --br-surface: #FFFFFF;
  --br-charcoal: #292622;
  --br-active-text: #FAF8F3;
  --br-brass: #A98552;
  --br-mocha: #765744;
  --br-sage: #8F9A7A;
  --br-amaranto: #8B1830;
  --br-mustard: #D1A72C;
  --br-muted: #81796F;
  --br-pending: #F4C430;
  --br-urgent: #D92D3F;
  --br-confirmed: #168B60;
}
```

```css
/* theme.css — imported after tokens.css */
@theme inline {
  --color-br-canvas: var(--br-canvas);
  --color-br-surface: var(--br-surface);
  --color-br-charcoal: var(--br-charcoal);
  --color-br-active-text: var(--br-active-text);
  --color-br-brass: var(--br-brass);
  --color-br-mocha: var(--br-mocha);
  --color-br-sage: var(--br-sage);
  --color-br-amaranto: var(--br-amaranto);
  --color-br-mustard: var(--br-mustard);
  --color-br-muted: var(--br-muted);
  --color-br-pending: var(--br-pending);
  --color-br-urgent: var(--br-urgent);
  --color-br-confirmed: var(--br-confirmed);
}
```

**Build verification:** demonstrate generated utilities such as `bg-br-canvas`, `text-br-charcoal` and `bg-br-mustard` in the actual browser. Merely declaring tokens is not sufficient. CSS examples may be adapted to the exact verified Tailwind v4 patch release while preserving their semantics.

### 3.3 Engineering prohibitions

- No imports from legacy CSS, layout components, theme providers or asset bundles.
- No parallel token systems with conflicting values.
- No per-page hardcoded geometry for universal primitives.
- No uncontrolled CSS specificity escalation.
- No styling dependent on the order in which unrelated modules mount.

---

## 4. Typography — PROPOSED until visual approval

### 4.1 Canonical typography behavior

- Compact uppercase **labels, values and actions** where established by the shared component grammar.
- Clear distinction between **field label** and **field value**; a label is not an external heading by default.
- No oversized headings as a substitute for meaningful navigation or section covers.
- Avoid unnecessary line wraps for short operational values and category labels.

### 4.2 Candidate type system — PROPOSED

- Start with a native-feeling, performant system sans stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- Use a small, explicit type scale in semantic roles: `micro-label`, `field-label`, `field-value`, `card-primary`, `card-secondary`, `section-action`, `numeric-display`.
- Determine actual `font-size`, `font-weight`, `line-height` and `letter-spacing` from side-by-side catalog samples at real phone widths. **Do not freeze arbitrary pixel values as canonical before visual review.**
- Prefer tabular numerals for dates, times, currency, room numbers and counts.
- Uppercase is a **visual treatment**, not a reason to transform stored user input or corrupt email addresses, names and locale-sensitive data.
- Never shrink important text below a legible threshold solely to make a broken layout fit; resolve layout/priority first. Any auto-fit behavior needs minimum size and accessible full-value access.

### 4.3 Overflow contract

Each text-bearing component MUST document: single-line vs wrapping behavior, min/max type size, truncation rule, full-value access (if truncated), and behavior at 320 CSS px and 200% text zoom. Truncation of operationally critical values without a retrieval path is a failure.

---

## 5. Iconography — CANONICAL concept / PROPOSED implementation

- Icons are the **primary navigation and action vocabulary**, not optional decoration.
- Use one coherent icon family with uniform optical weight, baseline and stroke treatment. **Lucide is a candidate, not yet a canonical mandate.**
- Create a semantic icon registry (`listing`, `people`, `dashboard`, `calendar`, `services`, `search`, `add`, `close`, `edit`, `maintenance`, `housekeeping`, `messages`, etc.).
- Every icon-only interactive element MUST have an accessible name and visible interactive feedback.
- Icons used as semantic state indicators must not rely on color alone.
- The selected footer state is conveyed by Mustard tile + white icon, with accessible current-location semantics.
- No arbitrary emoji or mismatched icon libraries in production components.

**OPEN:** exact approved glyph choices, stroke weight and optical sizing require mockup comparison. An agent may propose an improved coherent set with visual side-by-side evidence.

---

## 6. Geometry, spacing and tactile density

### 6.1 Canonical geometry

- Flat surfaces; no default shadows, gradients, pills or ornamental strokes.
- Small-radius rounded-square fields, tiles and cards.
- White fields and cards on Canvas, using spacing and hierarchy rather than heavy borders to separate content.
- Footer comprises **five independent equal square tiles**; do not convert it into a single rounded navigation bar.

### 6.2 Spacing and radius — PROPOSED

Define a compact spacing scale in tokens (for example a 4px base rhythm with useful intermediate values), plus semantic tokens for `field-padding`, `card-gap`, `grid-gap`, `cover-gap`, `footer-gap`, `section-inset`, `touch-hit-area` and `modal-inset`. Demonstrate at least **compact**, **default** and **long-content** examples before choosing final values.

Do not mistake density for tiny hit targets: visual glyphs can be compact while their touch hit areas remain adequate. Prefer a minimum **44×44 CSS px touch target** for primary controls unless a documented, accessible equivalent is approved.

### 6.3 No decorative expansion

A proposed redesign that replaces a two-column operational grid with oversized vertical cards, introduces unnecessary headings or increases scrolling without clear benefit is a **concept regression**, even if aesthetically polished.

---

## 7. Adaptive layout and responsive system

### 7.1 Canonical behavior

- **iPhone-first**, portrait primary, with useful tablet/desktop adaptation.
- Content adapts to **available container width**, not only hardcoded viewport breakpoints.
- No unintended horizontal overflow. Explicit horizontal calendar/date scrollers are exceptions.
- Fields use intrinsic sizing rules such as `min-width: 0` in flex/grid contexts and documented text-overflow strategies.
- Listing retains the approved compact **two-column room-card composition** at target phone widths; very narrow fallback requires a justified accessibility/layout decision.
- Respect `env(safe-area-inset-*)`, browser chrome, dynamic viewport changes, footer clearance and software keyboard.
- Footer must not overlap scrollable content; scrollable regions must not hide actionable controls.

### 7.2 Implementation patterns — PROPOSED

Use CSS Grid/Flexbox, container queries where useful, `minmax(0, 1fr)` for fractional tracks, intrinsic sizing and `clamp()` where justified. Avoid viewport-specific hardcoded widths and transforms that merely disguise clipping. Distinguish *visual size* from *hit area*.

### 7.3 Mandatory demonstration widths

**320, 375, 390, 430, 768 and 1280 CSS px**, plus portrait/landscape and text zoom. The catalog must show grid adaptation, longest realistic labels, long person names, currency, date/time, and an opened software keyboard where testable.

---

## 8. Universal component anatomy — binding visual requirements

The following are visual constraints. Interaction specifics remain governed by CMP-01 and INT-01.

| Primitive / pattern | Binding visual rule |
|---|---|
| `UniversalField` | Single white rounded-square surface; muted uppercase **internal** label; prominent uppercase value; editable and read-only variants share anatomy |
| `SearchField` | Derived from UniversalField; Sage search glyph replaces the usual label; no unrelated browser-search styling |
| `MiniUniversalField` | Compact category control on Canvas with intrinsic white chips; Brass add affordance; one expanded category at a time |
| `DateField` / `TimeField` | Approved side-by-side 50/50 presentation and inline touch wheels; preserve usable width |
| `UniversalLightbox` | Centered white panel, width up to 88vw, height up to 88svh, X top-right, internal scroll, attenuated/blurred backdrop; never a default bottom sheet |
| Footer | Five equal **independent square icon-only tiles** in fixed order; selected Mustard/white, inactive white/Charcoal |
| Cards | Compact, grid-aligned, reusable spacing and label system; no page-specific giant card style |
| Labels / badges | Shared semantic grammar; not random colored capsules or external headings |
| Covers / menus | Distinct per section, integrated into app shell, **not** large page title/subtitle blocks |

**OPEN:** exact covers, contextual menu layouts, approved icon shapes, typography metrics, card dimensions and fine spacing must be validated from source mockups. These are not permission to invent canon.

---

## 9. Visual states and accessibility

Each primitive must demonstrate relevant states: default, hover (where available), pressed, focused, selected, disabled, read-only, error, loading, empty and success. State styles MUST be shared and token-driven.

- Provide visible focus treatment even where decorative borders are otherwise disallowed.
- Maintain semantic labels for assistive technology even when the visual UI is icon-only.
- Validate contrast and non-color status cues.
- Respect reduced-motion settings; avoid animations that delay routine operations.
- Use native-feeling tactile feedback and deterministic transitions, not gratuitous effects.
- Do not use placeholder text as the sole accessible label.

---

## 10. Design catalog and evidence contract

**Gate 1 is not complete until the owner can inspect a running catalog.** Required catalog sections:

1. **Palette:** every canonical token, role, example, and contrast check.
2. **Typography:** proposed roles, upper/lowercase handling, numeric alignment, long-value behavior.
3. **Iconography:** coherent semantic icon grid, selected/inactive/focus states.
4. **Geometry:** spacing scale, radius samples, card density, touch targets.
5. **Fields:** UniversalField/SearchField/MiniUniversalField anatomy and responsive variations (component behavior may be finalized at Gate 2).
6. **Grid laboratory:** phone widths, two-column cards, 50/50 date/time, long-content stress cases.
7. **Shell preview:** a **non-final illustration** of headerless canvas/footer principles; complete covers/menus remain Gate 3 and require references.

For each sample, show its contract ID, status (CANONICAL/PROPOSED/OPEN), tokens used, and what owner decision is needed. A code-only report is insufficient.

### 10.1 Required evidence

- Actual browser screenshots at the mandatory widths.
- At least one real-device iPhone Safari review when available; otherwise mark **BLOCKED**, not PASS.
- Computed-style inspection proving canonical token values in rendered elements.
- No horizontal overflow at tested widths except approved horizontal scrollers.
- Keyboard focus and accessible names for icon-only controls.
- Token change propagation to multiple unrelated components.
- CSS dependency/import audit confirming no legacy UI contamination.

### 10.2 Gate verdicts

`PASS` = implementation + evidence + owner approval.  
`FAIL` = observed violation.  
`BLOCKED` = required evidence cannot be obtained.  
`NOT TESTED` = no verification performed.

Passing TypeScript, build and unit tests does **not** establish visual acceptance.

---

## 11. Anti-patterns — automatic rejection

- Old global BR logo/profile header, generic “OPERATIONS” heading or page subtitle.
- Generic dashboard template substituted for the five-environment concept.
- Footer converted to a continuous pill/nav bar, wrong order, wrong selected color or text labels.
- Missing section covers or contextual menus presented as a completed shell.
- Large vertical cards replacing the approved compact room grid without approval.
- External floating labels substituted for internal UniversalField labels.
- Lightbox replaced by a bottom sheet or nested modals.
- Per-module colors, typography or field dimensions unrelated to shared tokens.
- Clipped search fields, fixed widths, hidden values or unintended horizontal page scrolling.
- A beautiful static screenshot with inert controls claimed as an interactive component.
- Declaring “fully responsive” without viewport and real-browser evidence.
- Silent deviations from approved mockups described as improvements.

---

## 12. Explicit exclusions

This contract does **not** authorize: integration with Worker/D1, authentication, messaging, production deployment, edits to the old repository, implementation of all five modules, changes to canonical business logic, or automatic advancement beyond the currently approved gate.

---

## 13. Decisions still required before final freeze

| ID | Open item | Default treatment |
|---|---|---|
| `VIS-O01` | Exact font family and metrics | PROPOSED system stack; visual comparison required |
| `VIS-O02` | Exact icon family/glyph set | PROPOSED coherent line icons; owner review |
| `VIS-O03` | Spacing, radii and component measurements | PROPOSED token scale; catalog approval |
| `VIS-O04` | Contrast-safe treatment for canonical color pairings | Measure and propose exceptions; never silently recolor |
| `VIS-O05` | Approved cover and contextual menu designs | OPEN; source mockups required for Gate 3 |
| `VIS-O06` | Exact typography and field/card layouts from mockups | OPEN pending reference comparison |

These are tracked as open decisions, **not implementation blockers for a purely exploratory catalog**, but they prevent final visual signoff where they materially affect output.

---

## 14. Owner signoff

- [ ] Canonical concept and palette confirmed
- [ ] Proposed typography and icon direction reviewed
- [ ] Responsive/grid samples reviewed
- [ ] Accessibility/contrast exceptions reviewed
- [ ] Open reference-dependent decisions recorded
- [ ] Gate 1 catalog visually approved

**Contract status at delivery:** REVIEW CANDIDATE. No implementation or gate approval is implied by receipt of this document.
