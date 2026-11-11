# DEC-01 — Decision Register

**Version:** 1.0.0-draft  
**Status:** DOCUMENTARY RECONCILIATION APPROVED — unresolved product decisions remain open

| ID | Decision | Current status | Action |
|---|---|---|---|
| D-001 | Standalone project outside legacy repo | OWNER-CONFIRMED | `D:\Boutique rooms\br-os-design-system` and `docs\` verified |
| D-002 | React/TypeScript/Vite/Tailwind CSS v4 | CANONICAL | Implement |
| D-003 | Palette and footer order/colors | CANONICAL | Verify against mockups |
| D-004 | Exact font family and typographic scale | UNKNOWN | Owner review of samples |
| D-005 | Cover composition for each of five sections | UNKNOWN | Supply approved references/specifications |
| D-006 | Contextual menu entries and interaction per section | UNKNOWN | Supply approved references/specifications |
| D-007 | Icon family and glyph mapping | PROPOSED | Compare in visual catalog |
| D-008 | Grid breakpoints, precise spacing and radius | PROPOSED | Approve live phone preview |
| D-009 | Exact UniversalField and Lightbox geometry | PARTLY CANONICAL | Reconcile approved mockups |
| D-010 | Local iPhone preview delivery method | PROPOSED | Select safe method before exposure |
| D-011 | Backend integration | DEFERRED | Separate contract after UI acceptance |
| D-012 | GOV-02 registry mapping and specialist precedence | APPROVED | Use BASE-* aliases for foundational files; retain specialist IDs |
| D-013 | Explicit authorization required for every implementation gate | APPROVED | No gate implementation by implication; G1 requires separate authorization |
| D-014 | CDE-01 authoritative physical location | OWNER-CONFIRMED | `01_GOVERNANCE.md` is normative; this section is traceability only |
| D-015 | G0 host/scaffold and G1 token-gallery split | APPROVED | G0 is scaffolding/environment preparation; G1 is tokens and interactive gallery |

## Decision record template
```md
### D-XXX — Title
Status: OPEN / APPROVED / REJECTED / SUPERSEDED
Date:
Owner decision:
Evidence/reference:
Affected contracts:
Implementation impact:
```

Do not silently resolve UNKNOWN decisions through agent aesthetic preference.


## CDE-01 — Controlled Design Evolution

**Status:** CANONICAL TRACEABILITY RECORD  
**Applies to:** All BR OS Design System contracts, components, layouts and application modules.

**Normative source:** `01_GOVERNANCE.md`, CDE-01 section. This copy records the approved decision and is not an independent authority.

### 1. Design authority

BR OS is a mobile-first operational web application intended to deliver the interaction quality, spatial efficiency, visual consistency and tactile responsiveness of a professionally designed native smartphone application.

The approved design concept and interaction principles are authoritative. Existing mockups establish the baseline, not an absolute prohibition against improvement.

### 2. Professional design autonomy

The implementing agent is expected to exercise senior-level product design, UI architecture, visual design, interaction design and frontend engineering judgment.

The agent may identify and propose superior solutions where they improve usability, consistency, information density, accessibility, responsiveness, maintainability or operational efficiency.

### 3. Concept preservation

No proposed improvement may silently alter:

- The five-module application architecture.
- The icon-first navigation philosophy.
- The absence of a conventional persistent page header.
- Compact, adaptive, space-efficient layouts.
- The shared component and design-token system.
- The UniversalField and Universal Lightbox interaction concepts.
- The established semantic color roles.
- The operational relationships between modules.

Changes to these principles require explicit owner approval.

### 4. Improvement assessment

A proposed improvement must demonstrate a meaningful advantage over the approved baseline.

Technical convenience, reduced implementation effort, generic design conventions or subjective aesthetic preference do not independently constitute improvements.

### 5. Change classification

**REFINEMENT:** Improves execution without changing the approved concept. May be implemented within the authorized contract.

**DESIGN VARIANT:** Changes a visible interaction, composition or component behavior. Must be presented against the baseline and approved before adoption.

**CONCEPT CHANGE:** Alters an established BR OS principle. Must not be implemented without explicit owner authorization.

### 6. Acceptance authority

The project owner retains final design acceptance authority.

An implementation is not accepted solely because it compiles, passes automated tests or conforms to generic accessibility and frontend best practices.

Visual fidelity, operational usability, touch interaction, responsive behavior and adherence to the BR OS concept must also be demonstrated.

### 7. Governing principle

**Improve the solution. Preserve the concept. Demonstrate the improvement. Never substitute the designer's assumptions for the owner's intent.**
