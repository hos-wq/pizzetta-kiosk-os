# GOV-01 — Governance & Contract Control

**Version:** 1.0.0-draft  
**Status:** CANONICAL process / documentary reconciliation approved; product acceptance remains gate-specific

## Non-negotiable boundaries
- New project isolated from `D:\Boutique rooms\boutique-rooms-os`.
- Legacy repository is **reference only**; do not mutate, reset, commit, deploy, or import its UI/CSS/components.
- New project is a design system and interactive prototype, **not** an operational production application.
- No live API, Cloudflare deployment, remote D1, OAuth configuration changes, live messaging, or production credentials without separate explicit authorization.
- Do not declare a screen functional merely because a click works against fixture data.
- Owner-approved interactive mockups, when furnished, are design authority; if absent, label unverified details **UNKNOWN**.

## Implementation protocol
Each change must have: contract ID, affected files, exact behavior, acceptance criteria, screenshots or browser demonstration, and deviation list. Limit changes to the current approved gate. Do not expand scope opportunistically.

## Change control
Changes to CANONICAL decisions require a `CR-###` record with: old rule, proposed new rule, rationale, affected components, owner decision, date. Without approval, retain the existing rule.

## Definition of evidence
- **Implemented:** source exists.
- **Built:** bundler succeeds.
- **Tested:** named tests executed and pass.
- **Visually verified:** actual browser/iPhone-sized rendered UI inspected.
- **Operationally verified:** real UI → API → persistence → reload verified (out of scope until integration).

Never collapse these into one "DONE" status.

## Stop conditions
Missing canonical reference; design contradiction; attempted legacy import; need for deployment; requirement to alter production; inability to demonstrate responsive behavior; missing owner approval.


## CDE-01 — Controlled Design Evolution

**Status:** CANONICAL  
**Applies to:** All BR OS Design System contracts, components, layouts and application modules.

**Normative source:** This CDE-01 section is the sole normative source. The matching section in `11_DECISION_REGISTER.md` is retained as the decision and traceability record only.

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
