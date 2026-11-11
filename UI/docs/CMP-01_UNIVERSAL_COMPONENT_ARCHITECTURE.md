# CMP-01 — Universal Component Architecture

**Project:** BR OS Design System  
**Contract ID:** CMP-01  
**Version:** 1.0.0  
**Status:** REVIEW CANDIDATE — owner approval required  
**Scope:** Standalone mobile-first React/TypeScript UI component system; no backend integration  
**Authority:** CDE-01, VIS-01, LAY-01 and the approved BR OS interaction concept  
**Implementation target:** `D:\Boutique rooms\br-os-design-system`  
**Owner:** BR OS product owner

> **Contractual rule:** Improve the solution; preserve the concept. A passing build or automated test is not equivalent to visual and tactile acceptance.

---

## 00. Document authority and interpretation

### 00.1 Normative language

- **MUST / MUST NOT:** binding requirement.
- **SHOULD:** strong default; deviations require a documented rationale.
- **MAY:** permitted professional discretion.
- **CANONICAL:** approved BR OS concept, not subject to unilateral change.
- **PROPOSED:** implementation recommendation awaiting owner acceptance when it changes visible design or behavior.
- **ACCEPTANCE:** observable condition required to pass the relevant gate.

### 00.2 Source-of-truth hierarchy

1. Explicit owner decisions and approved interactive mockups.
2. CDE-01 controlled design evolution policy.
3. VIS-01 visual foundation and LAY-01 application shell contracts.
4. This CMP-01 component contract.
5. Implementation notes and examples.

When two contracts conflict, the agent MUST record the conflict, identify the affected component, and request a decision; it MUST NOT silently choose a different concept. Existing legacy UI is not design authority.

### 00.3 Separation of responsibilities

- **Tokens** define visual primitives and semantic roles.
- **Primitives** provide accessible behavior and geometry.
- **Universal components** implement shared BR OS patterns.
- **Composites** assemble universal components into reusable groups.
- **Modules** compose approved components for LISTING, PEOPLE, DASHBOARD, CALENDAR and SERVICES.
- **Adapters** will connect UI to backend in a later, separately approved phase.

The component library MUST NOT import code or CSS from the previous frontend.

---

## 01. Product and interaction principles — CANONICAL

1. BR OS is an **iPhone-first operational web application** with the tactile clarity of a native mobile app, not a compressed desktop dashboard.
2. **No conventional persistent page header** or redundant page titles. Navigation is icon-first; labels are purposeful and compact.
3. Components MUST use the available width intelligently. Rigid widths, accidental truncation, oversized whitespace and horizontal document overflow are unacceptable.
4. Information density is high but readable; touch accessibility and visual hierarchy are not sacrificed to density.
5. Visual language: flat, compact, rounded-square where needed; **no decorative shadows, gradients or pill-shaped controls** unless a specific approved contract overrides the rule.
6. Components MUST use semantic tokens; arbitrary colors, duplicated CSS and page-specific reimplementations are prohibited.
7. UniversalField and Universal Lightbox are foundational interaction patterns, not optional decoration.
8. The five footer modules MUST reuse the same component system while retaining their own contextual composition.
9. Demo components MUST be genuinely interactive with local state and fixture data; static screenshots are insufficient.
10. No backend calls, authentication, D1 migrations or production deployment in this contract's implementation scope.

---

## 02. Component taxonomy and registry

Each registered component MUST have a stable identifier, documented props, supported variants, states, keyboard/touch behavior, responsive rules, visual examples and tests.

| Family | Contract IDs | Required elements |
|---|---|---|
| Foundation | FND-01–06 | Typography, Icon, Surface, Divider, Spacing, ResponsiveGrid |
| Field | FLD-01–09 | UniversalField, SearchField, TextInput, TextArea, Number/Currency, Date, Time, Select/Combobox, Validation |
| Selection | SEL-01–05 | Toggle, Checkbox, Radio, SegmentedControl, ChoiceChip |
| Navigation | NAV-01–05 | FooterTile/FooterBar, ContextMenu, TabBar, SectionCover, Back/Close controls |
| Content | CNT-01–06 | DataCard, StatusLabel, Badge, ListRow, EmptyState, FeedbackState |
| Overlay | OVL-01–04 | UniversalLightbox, Confirmation, PickerPanel, InlinePopover |
| Composite | COM-01–04 | RoomCard, PersonRow, TaskCard, CalendarDayCell |

**Registry rule:** a module may configure a component but MUST NOT fork it. A missing capability is added to the shared component API after review, not duplicated locally.

---

## 03. Semantic design tokens — CANONICAL

Use the established semantic roles from VIS-01. The following baseline values are authoritative unless an approved VIS-01 revision supersedes them.

| Role | Value | Usage |
|---|---|---|
| Canvas | `#F7F5F1` | App canvas and category field backing |
| Surface | `#FFFFFF` | Fields, cards, tiles, lightboxes |
| Charcoal | `#292622` | Primary content and inactive icon glyphs |
| Active text | `#FAF8F3` | Text on selected dark/Brass treatments where appropriate |
| Ancient Brass | `#A98552` | Selected/active controls and focus emphasis |
| Mocha | `#765744` | Room identifiers |
| Sage | `#8F9A7A` | Square icon backgrounds with white glyphs |
| Amaranto | `#8B1830` | Calendar workload and date/time emphasis |
| Mustard | `#D1A72C` | TODAY, attention and selected footer tile |
| Muted | `#81796F` | Secondary labels and metadata |

Implementation MUST use a central Tailwind CSS v4 CSS-first token system, including `@theme inline` where appropriate. Components MUST reference semantic classes/variables, not repeat hex values. Color is never the only carrier of state; labels, icons or shape MUST also communicate meaning.

**PROPOSED:** component-level token aliases such as `--br-field-bg`, `--br-icon-tile-size` and `--br-touch-min` MAY be added if mapped to VIS-01 tokens and documented. Their final values require device inspection.

---

## 04. Shared component interface contract

### 04.1 API baseline

All interactive components MUST:

- Be implemented in TypeScript with explicit prop types and no `any` escape hatches.
- Support `disabled` and meaningful accessible naming when applicable.
- Distinguish controlled `value`/`onChange` from optional uncontrolled usage; avoid competing sources of truth.
- Expose `id`, `aria-*` and test hooks through safe prop forwarding where relevant.
- Avoid global mutable state and backend dependencies.
- Maintain stable layout during focus, validation, loading and value changes.
- Use native HTML semantics unless a custom pattern provides a demonstrably better interaction.
- Keep touch hit areas practical on iPhone without inflating the visible design; use invisible hit-area expansion where appropriate.
- Honor reduced motion and system text scaling where feasible.

### 04.2 Event and state model

A component MUST define its states explicitly: `default`, `hover` where relevant, `focus-visible`, `pressed`, `selected`, `expanded`, `disabled`, `readonly`, `invalid`, `loading` and `empty` as applicable. Impossible state combinations MUST be rejected or normalized. State changes MUST be visible and testable.

### 04.3 Content behavior

Text MUST NOT disappear silently because of fixed widths. Use appropriate wrapping, adaptive font sizing within accessible limits, or intentional ellipsis with full-value access. Do not solve long values by making all text tiny.

### 04.4 Geometry

Use square or modest rounded-square geometry. Consistent padding, aligned baselines and shared row heights are mandatory. Exact measurements not locked in VIS-01 remain **PROPOSED**, and MUST be tuned against iPhone screenshots and touch tests rather than chosen arbitrarily.

---

## 05. FLD-01 — UniversalField — CANONICAL

**Purpose:** one reusable field surface for editable and read-only values.

**Visual anatomy:** a single white rounded-square surface containing a muted uppercase label and a bold uppercase value. Label and value belong **inside the same field**, not as separate external blocks. Read-only and editable fields share the same appearance until interaction reveals their behavior.

**Required capabilities:**

- Text, number, currency, date, time, select and read-only presentations through one shared visual shell.
- Label, value, placeholder, helper/error message, required/optional state and disabled state.
- Long-value handling based on available width.
- Focus indication without changing the field's fundamental geometry.
- Native or accessible editing control as appropriate; no inaccessible simulated input.
- Inline validation with descriptive feedback and non-color error identification.
- `label`, `value`, `onChange`, `readOnly`, `disabled`, `required`, `error`, `size`/density and `leadingIcon`/`trailingAction` only where conceptually justified.

**MUST NOT:** introduce a floating external label, oversized Material-style outlined field, pill geometry, a separate page heading for each field, or five independent field designs.

**Acceptance:** the component gallery demonstrates at least eight value lengths, read-only/editable parity, focus, validation, keyboard opening and narrow-width behavior.

---

## 06. FLD-02 — SearchField — CANONICAL

A UniversalField derivative with the **Sage square magnifier treatment replacing the normal label**, not an unrelated search widget. Supports empty, query, clear, results, no-results and disabled states. Search behavior in the demo MUST filter real fixture rows. The search icon is semantically labelled for assistive technology. Long placeholder text MUST not cause document overflow.

---

## 07. FLD-03–09 — Input and picker family

### Text, textarea, number and currency

Use the UniversalField shell, appropriate input modes and locale-aware presentation without silently changing canonical stored values. Currency MUST distinguish display formatting from the underlying numeric value. Textareas expand within documented bounds and do not destabilize the layout.

### Date and time — CANONICAL

Date and Time MUST be presented as **two side-by-side 50/50 UniversalFields** when paired. The picker interaction is **inline touch-wheel selection**, not a generic full-screen calendar replacement or browser-dependent popup masquerading as the approved control. Touch wheels MUST support drag, tap, keyboard alternatives, clear selection and accessible value announcement. Timezone-sensitive demos use **Asia/Manila**.

**PROPOSED:** wheel physics, animation and exact item height are open to professional refinement, subject to device testing. The agent MUST NOT claim native-wheel fidelity without testing on an iPhone.

### Select / combobox

Support single selection, options, empty state, disabled items, search when appropriate, keyboard navigation and screen-reader semantics. Use one visual shell; menu placement MUST adapt to available viewport height and safe areas.

### Mini UniversalField C — CANONICAL

Category selector: Canvas-backed container with intrinsic white chips, **only one expanded at a time**, and a Brass `+` creation/add affordance. Chips MUST size to content without wasting a full row when unnecessary. Expansion and collapse MUST preserve focus and avoid overlapping adjacent controls.

---

## 08. SEL-01–05 — Selection controls

Toggle, Checkbox, Radio, SegmentedControl and ChoiceChip MUST share token usage, visual density, focus treatment and disabled/selected state semantics. They MUST not become generic pill-shaped desktop controls. Segmented controls MUST handle 2–5 options in a narrow viewport without clipping; when the option set is too long, the agent MUST propose a concept-preserving responsive alternative rather than shrinking labels below readability.

Selection is not represented by color alone. Native checkbox/radio inputs are preferred under custom styling to retain keyboard and assistive support.

---

## 09. NAV-01 — FooterBar and FooterTile — CANONICAL

**Exactly five independent equal square icon-only tiles**, ordered:

`LISTING · PEOPLE · DASHBOARD · CALENDAR · SERVICES`

- Selected tile: **Mustard `#D1A72C`**, white glyph.
- Inactive tiles: white surface, Charcoal glyph.
- Equal geometry, consistent icon weight and equal distribution across available width.
- Safe-area-aware bottom placement on iPhone; no overlap with scrolling content or keyboard.
- Icon-only visually; each tile MUST have an accessible text label.
- Each tile MUST navigate to a complete section with its own cover, menu and content.
- No large floating navigation bar, oversized active tile, generic hamburger replacing SERVICES or decorative labels under every icon.

**Acceptance:** all five tiles are tappable, selected state updates, history/back behavior is coherent, and no tile changes size when selected.

---

## 10. NAV-02–05 — Contextual navigation and cover components

### SectionCover — CANONICAL

Every module MUST have a recognizably composed **cover** governed by LAY-01, without recreating a conventional page header. Cover is a functional entry composition, not a large title banner. Exact layout is **PROPOSED pending mockup/owner comparison**.

### ContextMenu — CANONICAL

Every footer module MUST expose a meaningful module-specific menu, not a generic global menu or a placeholder. Menu options MUST connect to local demo interactions in the standalone build. Composition is subject to LAY-01.

### TabBar

Tabs use concise labels, clear active state and responsive width allocation. Horizontal scroll MAY be used only when it is deliberate, discoverable and demonstrably preferable to clipping. The LISTING Lightbox requires the five conceptual tabs `ROOM · TENANT · UTILITIES · OPERATIONS · TERMS`.

### Close and back

Back and close actions are distinct. Close dismisses an overlay; back navigates within the appropriate context. Both have consistent iconography and accessible names.

---

## 11. CNT-01–06 — Content components

### DataCard

Flat, compact, white card using consistent spacing and typography. Card anatomy MUST be configurable by slots or typed data, not copy-pasted markup. Cards MUST align predictably in two-column mobile grids where specified and avoid arbitrary minimum widths.

### StatusLabel / Badge

Semantic status presentation using tokenized color plus text or icon. Examples: occupancy, maintenance, housekeeping, task priority, due dates and attention. Do not turn every metadata field into a colorful badge. Status meaning MUST remain consistent across modules.

### ListRow

Compact touch row with icon or identity, primary text, secondary date/time and optional trailing action. Support variable-length names and empty metadata without alignment collapse.

### EmptyState / FeedbackState

Loading, empty, error, offline/unavailable and success states MUST use the same design grammar. Error states MUST describe the actual failed operation, not expose irrelevant local development instructions in a deployed app. Demo failures are simulated deliberately and clearly labelled as fixture states.

---

## 12. OVL-01 — UniversalLightbox — CANONICAL

**One universal centered overlay** for editing and detail views:

- White panel, centered in the viewport.
- Width approximately **88vw** and maximum height **88svh** on supported mobile viewports; adapt safely where accessibility or viewport constraints require.
- Close `X` at top-right.
- Background visually attenuated/blurred; background scrolling locked while open.
- Scroll **inside** the panel, not the underlying page.
- Focus enters the overlay on open and returns to the invoker on close.
- Escape closes when appropriate; destructive or unsaved-change behavior requires explicit handling.
- **No nested Lightboxes**; subordinate pickers and confirmation patterns MUST be managed within a single overlay hierarchy.
- The Lightbox MUST NOT silently become a bottom sheet.

**Acceptance:** tested with long content, keyboard open, safe-area insets, rotation, scroll lock, close action, focus restoration and a nested-action scenario that does not create a second Lightbox.

### OVL-02–04

Confirmation, PickerPanel and InlinePopover MUST respect the single-overlay rule. Destructive actions require an explicit confirmation path when undo is unavailable. Picker placement MUST not be clipped by the Lightbox's scroll container.

---

## 13. COM-01–04 — Shared module composites

These are **composition contracts**, not separate visual systems.

### RoomCard — CANONICAL

Compact two-column LISTING grid. Each room card exposes **four aligned information rows**: (1) room identifier/occupancy, (2) maintenance, (3) housekeeping, (4) next date. Room identifiers use Mocha. The card opens the shared Listing Lightbox with its five tabs. Fixtures include ten canonical rooms; BR·07/U-1007 has balcony **without view**. Derived occupancy is not manually persisted in UI fixtures as an independent truth.

### PersonRow

Primary name plus relevant date/time and semantic icon, sized for compact PEOPLE lists. Tapping opens the Person dossier in UniversalLightbox, not an oversized inline page dossier.

### TaskCard

Shared Services/Dashboard/Listing/Calendar task representation with `PENDING · IN PROGRESS · DONE` and `NORMAL · URGENT` semantics, plus required room, object and action. One fixture record MUST visibly update all relevant demo projections.

### CalendarDayCell

Five-row horizontal calendar grid concept; consecutive dates scroll horizontally. TODAY uses Mustard, workload Amaranto, weekend inner squares approximately 20% smaller as defined in the existing concept. Day selection opens a single Day Lightbox. Actual event editing and deletion in the demo MUST update local state, including an observable swipe-delete alternative accessible by button.

---

## 14. Responsive composition and sizing

**CANONICAL:** adapt components to **available container width**, not only device breakpoints. Use CSS Grid, Flexbox, `minmax(0, 1fr)`, intrinsic sizing and container queries where they improve composition. No global horizontal document overflow at common mobile widths.

**PROPOSED verification matrix:** 320, 375, 390, 430, 768 and 1024 CSS pixels, plus actual iPhone Safari. These widths are test fixtures, not a mandate to create six hard-coded layouts.

- Two-column cards MUST remain usable at supported iPhone widths; exceptions require an approved design variant.
- Fields MUST adapt labels and values without collision.
- Overlay and footer MUST respect `env(safe-area-inset-*)`.
- Text enlargement MUST not obscure essential actions.
- Keyboard opening MUST not hide the active field or trap the user.
- All content and actions MUST remain reachable in portrait orientation; landscape SHOULD remain functional.

---

## 15. Accessibility and touch contract

- Semantic HTML and accessible names for icon-only actions are mandatory.
- Focus visibility, logical tab order and correct dialog/combobox/listbox semantics are mandatory.
- Touch targets SHOULD meet a practical ~44 CSS-pixel target or equivalent effective hit area where dense UI requires smaller visible geometry.
- Motion MUST respect `prefers-reduced-motion`.
- Do not use color as the only signal for selected, urgent, error or disabled states.
- Use sufficient contrast for functional text and iconography; any tension with canonical colors MUST be reported rather than silently recolored.
- Screen reader and keyboard fallback MUST be provided for custom date/time wheels and swipe gestures.

Accessibility fixes are **REFINEMENTS** when concept-preserving; a visually significant redesign remains a **DESIGN VARIANT** requiring owner approval.

---

## 16. Engineering architecture — PROPOSED

Recommended independent structure (agent may refine without importing legacy):

```text
src/
  styles/
    tokens.css
    foundations.css
  components/
    foundation/
    fields/
    selection/
    navigation/
    content/
    overlays/
    composites/
  patterns/
  fixtures/
  gallery/
  app-shell/
  tests/
```

Recommended practices:

- React + TypeScript + Vite + Tailwind CSS v4, CSS-first configuration.
- Component variants expressed through typed props and tokenized classes.
- Minimal dependencies; explain each dependency's purpose.
- Automated component/unit tests plus browser interaction tests.
- A component gallery or Storybook-equivalent accessible from the standalone dev server.
- Avoid CSS cascade conflicts, global selector leakage and specificity escalation.
- Keep CSS architecture inspectable; no unreviewed parallel stylesheet overriding tokens.
- Avoid introducing a backend, data-fetching framework or global state library merely for gallery demonstrations.

**No code is authorized by the existence of this document.** The implementation gate must be approved separately.

---

## 17. Component gallery contract

The standalone gallery MUST contain:

1. **Tokens:** palette swatches, typography, icon scale, spacing, radius, surfaces.
2. **Fields:** editable/read-only, long labels/values, date/time wheels, validation, search filtering.
3. **Selections:** every control and all relevant states.
4. **Navigation:** five-tile footer, five cover/menu contexts, tabs and history behavior.
5. **Content:** cards, rows, semantic status, loading/empty/error states.
6. **Overlays:** long-content Lightbox, close/scroll/focus, confirmation and pickers.
7. **Composites:** ten-room grid, People list, shared tasks, five-row Calendar.
8. **Responsive lab:** interactive viewport presets and real-width overflow diagnostics.

A gallery item MUST show **what changes when tapped**, not merely how the component looks.

---

## 18. Acceptance gates — ACCEPTANCE

| Gate | Evidence required | Failure condition |
|---|---|---|
| CMP-A01 | Registry listing each component, props, states and owner | Undocumented variants or duplicates |
| CMP-A02 | Central Tailwind v4 token implementation | Hard-coded duplicate color systems |
| CMP-A03 | UniversalField demo with label/value inside one shell | External floating labels or inconsistent readonly mode |
| CMP-A04 | SearchField filters fixture data | Decorative non-functional search |
| CMP-A05 | Paired 50/50 Date/Time fields with operable wheels | Generic replacement or unusable touch control |
| CMP-A06 | Mini UniversalField C single-expanded behavior | Multiple simultaneous expanded categories |
| CMP-A07 | Exactly five equal footer tiles, correct states and routing | Oversized active tile, wrong icon or dead link |
| CMP-A08 | Five covers and contextual menus with working fixture interactions | Missing menu, generic header or placeholder |
| CMP-A09 | Centered 88vw/88svh Lightbox, internal scroll and focus handling | Bottom sheet, nested dialog or background scroll |
| CMP-A10 | RoomCard, PersonRow, TaskCard, CalendarDayCell composites | Independent inconsistent page implementations |
| CMP-A11 | 320–430px and tablet viewport screenshots; no document overflow | Clipped fields, uncontrolled whitespace or broken grid |
| CMP-A12 | Keyboard, screen reader naming, reduced-motion and touch review | Inaccessible essential control |
| CMP-A13 | Unit/browser tests and reproducible run commands | “PASS” asserted without runnable evidence |
| CMP-A14 | Owner review of real browser/iPhone behavior | Automated tests substituted for visual acceptance |

**Mandatory delivery artifact for each implementation gate:** file-change inventory, runnable URL/command, before/after screenshots where applicable, test results, known limitations, and explicit list of any proposed deviations. The agent MUST stop at the authorized gate.

---

## 19. Anti-pattern register — MUST NOT

- Reintroduce the legacy large logo/header/title/subtitle shell.
- Create oversized vertical desktop cards instead of compact mobile compositions.
- Treat footer navigation as proof that the five modules exist.
- Duplicate field components per page or use external labels by default.
- Replace UniversalLightbox with a bottom sheet or nested modal stack.
- Replace inline date/time wheels with unrelated native dialogs without approval.
- Use generic hamburger menus where SERVICES or a contextual menu is required.
- Hide truncation, overflow or missing actions behind a passing test suite.
- Hard-code arbitrary widths that break at 320–430px.
- Connect backend or modify production as part of the design-system phase.
- Interpret a technical simplification as a user-experience improvement without evidence.

---

## 20. Decision register and unresolved items

| ID | Status | Question | Owner action |
|---|---|---|---|
| CMP-D01 | PROPOSED | Exact component spacing, heights, radii and icon dimensions | Approve after browser/iPhone gallery inspection |
| CMP-D02 | PROPOSED | Exact cover and contextual menu compositions | Compare with approved interactive mockups under LAY-01 |
| CMP-D03 | PROPOSED | Final font family and type scale where VIS-01 has not frozen values | Visual review and accessibility check |
| CMP-D04 | PROPOSED | Wheel interaction physics and animation | Touch-test on iPhone |
| CMP-D05 | PROPOSED | Gallery tooling (custom catalog vs Storybook-equivalent) | Agent recommendation with cost/maintenance rationale |
| CMP-D06 | PROPOSED | Compact responsive behavior for unusually long labels | Demonstrate variants and request approval if concept changes |

No unresolved item may be silently converted to CANONICAL by implementation.

---

## 21. Handoff conditions

This document becomes **APPROVED** only after explicit owner review. Upon approval, it authorizes a future scoped implementation proposal, **not** unrestricted implementation or deployment.

The next logical contract after CMP-01 is the **component implementation and demonstration gate**, with a separate execution order and acceptance evidence. Backend integration remains out of scope until the visual system and five-module shell have been approved on an actual device.

**Final rule:** One shared component architecture; five coherent operational environments; no silent concept drift.
