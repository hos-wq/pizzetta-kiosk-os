# EXE-01 — Implementation & Acceptance Protocol

**Project:** BR OS Design System  
**Contract ID:** EXE-01  
**Version:** 1.0.0  
**Status:** REVIEW CANDIDATE — owner approval required  
**Scope:** Isolated frontend design-system project, prior to backend integration  
**Target location:** `D:\Boutique rooms\br-os-design-system\docs\EXE-01_IMPLEMENTATION_ACCEPTANCE_PROTOCOL.md`  
**Authority:** CDE-01, VIS-01, LAY-01, CMP-01 and applicable numbered `docs/` contracts

> **Interpretation rule:** This document defines execution governance and acceptance evidence. It does not supersede the detailed requirements of the other contracts. Where contracts disagree, the agent must stop the affected work, document the conflict and request an owner decision. No inferred resolution is authorized.

---

## 01. Purpose and non-negotiable outcome

Build an isolated, coherent, production-quality **mobile-first web-app design system** that behaves like a well-designed native smartphone application. The deliverable is **not** a restyling of the legacy BR OS frontend and **not** an API-integrated application at this stage. It must make the approved concept tangible through a browsable component gallery, interactive application shell and five demonstrable module experiences using fixture data.

**Definition of success:** the owner can open the implementation on an iPhone, navigate all five footer destinations, inspect their distinct cover/menu/content structures, interact with reusable components and judge the actual result against approved contracts and mockups. A successful build or test suite alone is insufficient.

## 02. Normative language and decision authority

- **MUST / MUST NOT:** mandatory condition; violation blocks acceptance.
- **SHOULD:** preferred implementation, with documented technical rationale for deviations.
- **MAY:** permissible within the approved gate and CDE-01.
- **CANONICAL:** approved design concept, not alterable by the agent.
- **PROPOSED:** unapproved design or technical choice; requires owner review when visible or concept-affecting.
- **ACCEPTED:** owner explicitly approved the gate after reviewing evidence.
- **BLOCKED:** cannot be verified or a mandatory dependency is missing.

The owner is the **sole acceptance authority**. The agent may report tests, observations and recommendations, but may not self-certify owner acceptance. Silence is not approval. A gate marked `REVIEW CANDIDATE` remains unapproved until explicit authorization.

## 03. Repository isolation and permissions

1. The agent's writable scope is exclusively `D:\Boutique rooms\br-os-design-system` (the new isolated project), subject to owner-approved exceptions.
2. The existing `boutique-rooms-os` repository, its databases, configuration, assets and deployments are **read-only references**. No changes, cleanup, package installation, git commands that mutate its state, migrations or deployments there.
3. **No imports, symlinks, CSS, components or route dependencies from the legacy frontend.** Referencing the legacy repository for domain understanding does not authorize copying its UI architecture.
4. Keep all new documentation under `docs/`; maintain a clear source/test/demo structure in the isolated project.
5. Do not access or copy production secrets, credentials, personal records or tenant data. Use synthetic fixtures only.
6. Do not modify production environments or deploy publicly without separate owner authorization.
7. If the agent cannot ensure filesystem isolation, it must stop before writing code.

## 04. Contract precedence and conflict handling

For execution, apply: (1) explicit owner decisions and approved change records; (2) CDE-01 concept preservation; (3) specialized contracts VIS-01, LAY-01, CMP-01; (4) existing foundational `docs/` contracts; (5) implementation proposals. This ordering is **not permission to silently override a conflicting requirement**: record the conflict and ask for resolution before implementing the affected element.

The agent MUST perform a documentation inventory before coding and produce a **Contract Traceability Matrix (CTM)** linking every applicable requirement to component/module, test and acceptance evidence. Do not fabricate contract IDs or claim unreviewed documents are approved.

## 05. Work authorization model

The owner authorizes **one gate at a time**. A request to plan a gate does not authorize implementing later gates. The agent must end each gate with an acceptance package and stop. No opportunistic refactoring, backend wiring, feature expansion, deployment or parallel implementation outside the gate.

Each gate follows:

`READ CONTRACTS → INVENTORY & PLAN → OWNER AUTHORIZATION → IMPLEMENT → VERIFY → DEMONSTRATE → REPORT → OWNER ACCEPT/REJECT → NEXT GATE`

The agent must identify unresolved design decisions **before** irreversible or expensive implementation. It may offer variants under CDE-01, with baseline comparison and trade-offs, but cannot silently choose a concept-changing variant.

## 06. Gate sequence and required deliverables

| Gate | Authorized objective | Required visible deliverable | Exit condition |
|---|---|---|---|
| **G0 — Foundation** | Inspect contracts; establish isolated Vite/React/TypeScript/Tailwind CSS v4 project, tooling, documentation and traceability | Locally running blank design-system host with working mobile viewport, token preview placeholder, reproducible commands | Owner verifies isolated startup and CTM; no legacy imports |
| **G1 — Tokens & primitives** | Implement canonical palette, semantic tokens, typography, icon conventions, spacing, geometry, responsive primitives | Interactive token gallery and primitive layout examples | Color roles, theme behavior, sizing and responsive tests verified |
| **G2 — Universal components** | Implement CMP-01 components and interaction states, including fields, selectors, Lightbox, cards, labels, tabs, controls | Browsable component gallery with live states, keyboard and touch interactions | Component contract checks and owner visual review pass |
| **G3 — Application shell** | Implement five-tile footer, cover and contextual menu framework, responsive app shell without traditional header | Navigable five-destination shell with distinct cover/menu examples | All five destinations visibly work; safe areas and compact layout verified |
| **G4 — Module compositions** | Compose Listing, People, Dashboard, Calendar and Services from approved components using synthetic fixtures | Five navigable interactive demo modules with realistic states | Each module meets its specialized contract and interaction checklist |
| **G5 — Integration readiness** | Document typed frontend boundaries, adapters, integration assumptions and handoff; **do not connect backend** | Integration map, unresolved API questions, component/API mapping, final acceptance dossier | Owner signs off UI baseline and explicitly decides whether integration may begin |

**Gate sequencing note:** G2 may require a minimal shell for the gallery and G3 may reuse already approved components; this does not authorize completing later-gate features early. Cross-gate dependencies must be documented.

## 07. Deliverable standards for every gate

Every gate handoff MUST include:

1. **Scope ledger:** authorized work, completed work, deferred work and out-of-scope changes (expected: none).
2. **Changed-files manifest:** created/modified paths and brief purpose; no vague “many files changed” claims.
3. **Contract traceability:** requirement → implementation → evidence → result, with `PASS`, `FAIL`, `BLOCKED` or `NOT TESTED`.
4. **Reproduction instructions:** exact commands, working directory, local URL and prerequisites.
5. **Visual proof:** actual screenshots or browser-visible views at agreed viewport sizes; mockups or code excerpts do not count as rendered evidence.
6. **Interaction proof:** demonstrated user actions and observable outcomes; tests alone do not prove touch behavior.
7. **Test report:** exact commands, pass/fail counts, environment, skipped checks and known limitations.
8. **Deviation register:** design refinements, variants and concept-change requests classified under CDE-01.
9. **Open issues:** severity, reproduction steps, impact and owner decision needed.
10. **Explicit stop:** do not proceed to the next gate without approval.

If an actual iPhone test is unavailable, mark it **NOT TESTED**; do not substitute desktop responsive emulation and claim mobile acceptance.

## 08. Acceptance evidence hierarchy

Evidence is cumulative, not interchangeable:

- **E1 — Static:** source, typecheck, lint, unit tests, CSS compilation.
- **E2 — Rendered:** real browser output, computed styles, viewport captures, no runtime errors.
- **E3 — Interactive:** keyboard, pointer and touch workflows; focus, scrolling, transitions, state updates.
- **E4 — Device:** actual iPhone Safari / installed PWA where applicable; safe-area, viewport, zoom, keyboard and orientation behavior.
- **E5 — Owner:** explicit visual and functional acceptance against contracts and approved concept.

A gate requiring E4/E5 is **BLOCKED or PENDING REVIEW**, not `PASS`, if that evidence is missing. Never report “production-ready” solely from E1–E3.

## 09. Mandatory visual and responsive verification

The agent MUST test, document and show at least these viewport classes, using representative widths (examples, not device-specific promises):

| Class | Example CSS viewport | Primary check |
|---|---|---|
| Narrow phone | 320 × 640 | No horizontal overflow; fields, controls and labels remain usable |
| Standard phone | 375 × 812 | Compact density; footer, cover and content coexist |
| Wide phone | 430 × 932 | Fluid expansion without gratuitous empty columns |
| Tablet / desktop | 768 × 1024 and 1280 × 800 | Intentional layout adaptation; no stretched mobile controls |

The actual target iPhone and its reported CSS viewport should be added to the test matrix once known. Check portrait and landscape when relevant, dynamic browser chrome, safe-area insets, large text and on-screen keyboard.

**Hard visual failures:** conventional persistent header, redundant page titles/subtitles, missing module cover/menu, five footer tiles with unequal geometry, unbounded text truncation without designed handling, hardcoded widths causing overflow, unrelated card styles, inconsistent label/value treatment, nested Lightboxes, CSS overrides leaking from legacy styles, or unexplained whitespace that reduces operational density.

## 10. Functional acceptance by system area

### 10.1 Tokens and theme
- Every semantic color role resolves from a single canonical token source; no scattered magic hex values for governed roles.
- Tailwind CSS v4 theme definitions and utilities work in the built output, not merely in source.
- Selected, active, attention, workload, room and service roles use the approved semantic colors consistently.

### 10.2 Universal components
- Field label and value appear within the prescribed unified control; editable and read-only variants share geometry.
- Date and time selectors support the specified side-by-side and touch-wheel behavior where contracted.
- SearchField and compact category selector follow their specialized contracts rather than generic substitutes.
- Universal Lightbox is centered, constrained to approved viewport bounds, scrolls internally, locks background scroll and restores focus; no nested instances.
- Controls expose disabled, focus, loading, empty, error and selected states as applicable.

### 10.3 Shell and navigation
- Exactly five primary footer destinations: **LISTING, PEOPLE, DASHBOARD, CALENDAR, SERVICES**.
- Footer icons are the primary visual affordance; active tile uses the approved Mustard role.
- Every destination presents its own cover and contextual menu; the application does not revert to legacy page headers.
- Navigation is functional in the demo and retains sensible state where appropriate.

### 10.4 Modules
- **LISTING:** ten canonical rooms represented in compact cards; mock occupancy/service information clearly synthetic.
- **PEOPLE:** compact searchable people rows and dossier interaction through approved Lightbox behavior.
- **DASHBOARD:** distinct Messages, Maintenance and Housekeeping operational entry points.
- **CALENDAR:** five-row horizontally navigable date matrix and correct semantic today/workload treatments; demo events are interactive.
- **SERVICES:** maintenance/housekeeping task views and state changes demonstrated through shared synthetic records.

The module details remain governed by the applicable module contracts; these bullets are minimum smoke checks, not replacement specifications.

## 11. Synthetic fixture contract

Use a single, deterministic fixture layer with stable IDs and explicitly fictional names/contacts. All demo modules MUST consume shared fixture entities so a task or occupancy change is reflected consistently in the relevant views during the session. In-memory updates are permitted; they must not be misrepresented as persisted backend operations. Include empty, loading, error and populated states that can be triggered for demonstration.

No live D1, Worker, OAuth, Messenger, WhatsApp or production API calls are permitted before a separate integration authorization.

## 12. Accessibility and touch quality

- Use semantic HTML, accessible names, keyboard operation, visible focus, appropriate roles and state announcements.
- Support touch interaction without hover-only controls or precision gestures as the sole path.
- Provide sufficiently large and separated touch targets, with documented exceptions for dense controls.
- Respect reduced-motion preference and user font scaling where feasible.
- Verify focus trapping/restoration and scroll locking for modal UI.
- Do not use accessibility as a pretext for replacing the approved compact app concept with generic oversized layouts; resolve both constraints professionally.

## 13. Controlled Design Evolution procedure

For each proposed change, create a short **Design Decision Record (DDR)**:

```text
DDR ID:
Affected contract / requirement:
Classification: REFINEMENT | DESIGN VARIANT | CONCEPT CHANGE
Approved baseline:
Proposed solution:
User benefit and measurable trade-off:
Visual comparison / demo link:
Accessibility and responsive impact:
Owner decision: PENDING | APPROVED | REJECTED
Date / version:
```

A **REFINEMENT** within the authorized gate may be implemented with rationale. A **DESIGN VARIANT** affecting visible composition or interaction requires owner approval before adoption. A **CONCEPT CHANGE** must never be implemented without explicit authorization and a contract amendment. A faster implementation is not, by itself, an improvement.

## 14. Defect severity and gate blocking

| Severity | Definition | Gate result |
|---|---|---|
| **P0** | Data/security risk, writes outside scope, inaccessible app, destructive change | Immediate stop; reject |
| **P1** | Violates canonical concept, broken navigation, missing required cover/menu, major overflow, unusable core interaction | Reject until fixed |
| **P2** | Significant visual mismatch, inconsistent component behavior, accessibility regression | Normally blocks acceptance; owner may explicitly defer |
| **P3** | Minor polish issue with no material usability impact | Record and optionally defer with owner consent |

Failures must be reported with observed evidence and reproduction steps. Do not infer backend or deployment root causes from screenshots alone.

## 15. Test and quality minimums

- TypeScript strict checks, lint, production build and relevant unit/component tests must run and report exact results.
- Browser interaction checks must cover navigation, modal lifecycle, fields, selectors, state variants and responsive overflow.
- No console errors, missing CSS/theme compilation or broken icon assets in accepted demo paths.
- Include at least one visual regression baseline per representative component and each of the five modules, with reviewable screenshots.
- Avoid brittle tests that merely assert a heading exists; verify the contracted structure and behavior.
- Test failures must not be hidden behind broad skips or reported as success.

## 16. Git and artifact integrity

At each gate, report `git status`, current branch, commit identifier if one exists, and which files are uncommitted. **Uncommitted does not automatically mean undeployed**, and a successful deployment does not prove which source revision was used. Never conflate working tree, committed revision, built artifacts and deployed environment. Commits and pushes require authorization according to the owner's workflow; production deploys always require explicit separate authorization.

Record the build timestamp, source revision and demo environment for reproducibility. Never claim an iPhone has received the latest build without validating the served asset version.

## 17. Stop conditions and escalation

The agent MUST stop and request guidance if:

- contracts conflict on a material design decision;
- a required approved mockup or reference is unavailable;
- isolation cannot be guaranteed;
- a requested action would touch legacy code, live services or secrets;
- the proposed design alters the canonical concept;
- a gate requires real-device evidence that is unavailable;
- significant scope expansion or additional cost is foreseeable.

Report the blocker succinctly, offer a bounded recommendation and wait. Do not create additional tasks to work around an owner decision.

## 18. Standard gate handoff template

```markdown
# GATE [ID] — Acceptance Handoff
Status: READY FOR OWNER REVIEW | BLOCKED | REJECTED | ACCEPTED BY OWNER
Authorized scope:
Implemented:
Not implemented / deferred:
Changed files:
Contract Traceability Matrix:
Commands and local URL:
Test results (PASS / FAIL / NOT TESTED):
Rendered evidence (viewport, date, asset version):
Interactive evidence:
Actual iPhone evidence (or NOT TESTED):
Design Decision Records:
Open defects (P0–P3):
Known limitations:
Owner approval requested for:
Next gate: NOT STARTED
```

## 19. First Codex session — permitted actions only

**Before G0 authorization**, the new agent may: read `docs/`, inspect the new empty project, inspect the legacy repository read-only when specifically necessary, inventory requirements, flag contradictions and propose a G0 plan. It MUST NOT write application code, install packages, mutate the legacy project or start later gates until authorized.

Recommended opening instruction:

> Read all Markdown contracts in `D:\Boutique rooms\br-os-design-system\docs`. Treat them as project requirements, not suggestions. Work only in the isolated design-system directory; the legacy repository is read-only. First produce a concise contract inventory, contradictions/open decisions, Contract Traceability Matrix outline and G0 implementation plan. Do not write code or install dependencies yet. Wait for explicit approval to execute G0.

## 20. Owner sign-off

- **Document state:** REVIEW CANDIDATE
- **Review outcome:** PENDING
- **Owner approval date:** —
- **Approved deviations:** —
- **Next authorized action:** Contract consistency audit, then explicit G0 planning authorization

**Governing principle:** *Build the design system, prove the interaction, obtain approval, then proceed. Never substitute passing tests or an agent's assurance for the owner's visual acceptance.*
