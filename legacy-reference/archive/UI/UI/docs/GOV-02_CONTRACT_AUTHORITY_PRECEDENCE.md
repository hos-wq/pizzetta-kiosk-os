# GOV-02 — Contract Authority, Precedence & Registry Reconciliation

**Project:** BR OS Design System  
**Contract ID:** GOV-02  
**Version:** 1.0.0  
**Status:** OWNER-APPROVED — documentary reconciliation; implementation still gate-authorized separately  
**Related:** AUD-01 findings F01–F09; CDE-01; EXE-01  
**Target:** `D:\Boutique rooms\br-os-design-system\docs\GOV-02_CONTRACT_AUTHORITY_PRECEDENCE.md`

## 01 — Purpose and scope

This amendment resolves *document-control* ambiguity without altering the BR OS product concept. It establishes a unique registry, precedence rules, gate permissions, and treatment of unresolved visual decisions. It does not authorize implementation, legacy-repository modification, backend integration, or deployment.

**Evidence boundary:** This amendment was reconciled against the actual Windows `docs/` contents, including the 12 foundational documents, the specialist VIS-01, LAY-01, CMP-01, EXE-01 and AUD-01 documents, and both local CDE-01 copies. The project path and document readability were verified read-only.

## 02 — Normative terms

- **CANONICAL:** Established BR OS product principle; no unilateral change.
- **SPECIALIST:** Scope-specific governing contract, subject to owner approval.
- **BASELINE:** Earlier supporting contract, authoritative where consistent and not superseded.
- **PROPOSED:** Candidate requiring review where it affects visible design or behavior.
- **UNKNOWN:** Missing authority or evidence; never treated as implied permission.
- **AUTHORIZED:** Owner has explicitly approved work on a *named gate*.
- **ACCEPTED:** Owner has explicitly approved that gate's demonstrated result.
- **SUPERSEDED:** A specifically identified instruction is replaced; the underlying file remains retained for traceability.

Document **presence**, contract **approval**, implementation **authorization**, and gate **acceptance** are four different states. Copying a file to `docs/` establishes presence only.

## 03 — Unique contract registry

The physical filenames below remain unchanged. The four original IDs are reclassified *in the registry*, avoiding destructive edits to historical source files.

| Effective ID | File | Role | Authority |
|---|---|---|---|
| REG-01 | `00_README.md` | Original registry, historical index | BASELINE; registry ID mappings superseded by GOV-02 |
| GOV-01 | `01_GOVERNANCE.md` | General governance | BASELINE |
| ARC-01 | `02_ARCHITECTURE.md` | Standalone architecture | BASELINE |
| BASE-VIS | `03_VISUAL_TOKENS.md` | Original visual rules | BASELINE; former VIS-01 |
| BASE-LAY | `04_LAYOUT_NAVIGATION.md` | Original layout rules | BASELINE; former LAY-01 |
| BASE-CMP | `05_COMPONENT_LIBRARY.md` | Original component rules | BASELINE; former CMP-01 |
| INT-01 | `06_INTERACTION_ACCESSIBILITY.md` | Interaction and accessibility | BASELINE |
| DOM-01 | `07_MODULE_CONTRACTS.md` | Module/domain demonstrations | BASELINE |
| DAT-01 | `08_DATA_BOUNDARIES.md` | Synthetic data boundaries | BASELINE |
| QUA-01 | `09_ACCEPTANCE_GATES.md` | Original quality gates | BASELINE |
| BASE-EXE | `10_CODEX_EXECUTION.md` | Original agent instructions | BASELINE; former EXE-01 |
| DEC-01 | `11_DECISION_REGISTER.md` | Original decision ledger | BASELINE; updates required |
| VIS-01 | `VIS-01_VISUAL_FOUNDATION.md` | Visual foundation | SPECIALIST |
| LAY-01 | `LAY-01_APPLICATION_SHELL.md` | Shell, covers, menus, grids | SPECIALIST |
| CMP-01 | `CMP-01_UNIVERSAL_COMPONENT_ARCHITECTURE.md` | Universal components | SPECIALIST |
| EXE-01 | `EXE-01_IMPLEMENTATION_ACCEPTANCE_PROTOCOL.md` | Execution and acceptance | SPECIALIST |
| AUD-01 | `AUD-01_CONTRACT_CONSISTENCY_READINESS.md` | Findings and evidence | AUDIT; informative, not implementation authority |
| GOV-02 | `GOV-02_CONTRACT_AUTHORITY_PRECEDENCE.md` | This reconciliation | SPECIALIST governance; pending approval |
| CDE-01 | **Location to be verified in owner's `docs/`** | Controlled Design Evolution | Owner-approved principle; canonical *content* per conversation, file authority unresolved |

**No renaming required.** Where the original document headings still say VIS-01, LAY-01, CMP-01 or EXE-01, cite them by the effective `BASE-*` identifier and physical filename. Never cite a bare duplicate ID without the filename.

## 04 — Authority and precedence

1. Owner's explicit, current product decisions and approved reference mockups, within their stated scope.
2. Owner-approved CDE-01 principles governing controlled design evolution.
3. Owner-approved GOV-02 for document identity, conflict handling and authorization rules.
4. Applicable approved specialist contracts: VIS-01, LAY-01, CMP-01, EXE-01, each within its scope.
5. Applicable foundational contracts and their non-conflicting canonical requirements.
6. Accepted change requests and decision records, applied only to their explicitly stated scope. A later approved change may supersede an earlier rule only if it identifies the rule and scope.
7. Agent proposals and defaults: non-normative until approved where approval is required.

**Conflict rule:** Precedence determines the likely governing source; it does **not** authorize silent reinterpretation. If two mandatory requirements cannot both be met, log the exact passages, affected scope and proposed resolution, and stop only the affected work pending owner decision. Unaffected, separately authorized work may continue.

**Design-evolution rule:** Under CDE-01, an agent may implement refinements that preserve the concept within an authorized gate. A visible design variant needs owner review; a concept change needs explicit owner authorization. Engineering convenience alone is not proof of UX improvement.

## 05 — CDE-01 location: verified normative source

The local documentation was inspected. CDE-01 appears in both `01_GOVERNANCE.md` and `11_DECISION_REGISTER.md` with identical substantive text.

Before freezing GOV-02, the owner or read-only inventory agent must record:

- Canonical physical path and heading of CDE-01.
- Version/date, if present.
- Whether any secondary copy exists, and whether it is merely a reference.
- Any discrepancy between the locally stored text and the owner-approved CDE-01 statement.

`01_GOVERNANCE.md`, CDE-01, is the sole normative source. The matching section in `11_DECISION_REGISTER.md` is a decision and traceability record only. The secondary copy is retained without substantive change.

## 06 — First-session authorization: precise override

The phrase in `10_CODEX_EXECUTION.md` that says to **“Implement only Gate 0 and the preparation for Gate 1”** is **SUPERSEDED AS AN AUTHORIZATION**. It is not permission to code.

Until the owner explicitly authorizes **G0**, the new Codex session may only:

1. Read/inventory accessible contracts and project files.
2. Confirm repository boundaries and identify inconsistencies.
3. Produce a contract traceability matrix draft and a G0 execution plan.
4. Report blocking decisions, missing mockups and evidence limitations.

It **must not** scaffold, install packages, write code, edit contracts, execute migrations, access secrets, deploy or modify the legacy repository merely because a document mentions G0.

Once **G0** is expressly authorized, only G0 work may proceed. G1 needs a separate authorization after G0 review and acceptance. Each subsequent gate likewise requires a new owner decision.

## 07 — Gate deliverables: G0 versus G1

| Gate | Allowed after explicit authorization | Not yet in scope |
|---|---|---|
| **G0** | Isolated React/TypeScript/Vite/Tailwind CSS v4 host, basic preview scaffold, contract inventory, traceability matrix, isolation proof, runnable preview | Finished canonical tokens, completed token gallery, universal components, five modules, backend |
| **G1** | Implemented visual tokens, typography/icon candidate catalog, responsive primitives, inspectable token gallery, actual browser/iPhone review | Universal component library or application modules unless separately authorized |

The `10_CODEX_EXECUTION.md` first-deliverable sentence requiring a completed token gallery at G0 is **SUPERSEDED** by this G0/G1 separation. Do not claim G1 PASS because a G0 placeholder renders.

## 08 — Open design authority

These remain unresolved unless supported by owner-approved mockups or explicit decisions: exact font family/scale, icon family and mappings, cover compositions for each of the five modules, contextual menu hierarchy/actions, precise grid sizing and spacing, Lightbox/field geometry beyond frozen canonical rules, and iPhone preview delivery method.

Codex may demonstrate labeled **PROPOSED** options under an authorized gate. It may not omit required covers/menus or declare a provisional generic UI approved. Gate 3 acceptance requires distinct, functioning covers and contextual menus for **LISTING, PEOPLE, DASHBOARD, CALENDAR, SERVICES**, individually reviewed against approved evidence or accepted variants.

Create `docs/references/` and a reference manifest only when assets are actually supplied or when that documentation work is authorized. Never claim absent mockups have been inspected.

## 09 — Applied decision register corrections

The owner-approved documentary reconciliation has been applied to `11_DECISION_REGISTER.md`:

| Record | Proposed update | Evidence/qualification |
|---|---|---|
| D-001 | `OWNER-CONFIRMED`: `D:\Boutique rooms\br-os-design-system` and `docs\` verified | Read-only filesystem inspection |
| D-002, D-003 | Retain CANONICAL | No product change |
| D-004–D-010 | Retain existing UNKNOWN / PROPOSED / PARTLY CANONICAL status | No visual signoff implied |
| D-011 | Retain DEFERRED | Backend not authorized |
| D-012 | GOV-02 registry mapping: `APPROVED` | Resolves duplicate IDs |
| D-013 | G0 requires explicit authorization: `APPROVED` | Reconciles first-session instructions |
| D-014 | CDE-01 authoritative physical location: `OWNER-CONFIRMED` | `01_GOVERNANCE.md` is normative |
| D-015 | G0 host / G1 token gallery split: `APPROVED` | Reconciles deliverables |

The specialist contract index is now included in `00_README.md`; the historical foundational requirements remain preserved under BASE-* aliases.

## 10 — Traceability and evidence requirements

The Contract Traceability Matrix (CTM) must include at minimum:

`effective contract ID | source filename | section | requirement | status | target component/gate | test | visual evidence | owner decision`.

Keep the following states separate:

- `DOCUMENT PRESENT / MISSING / UNVERIFIED`
- `REQUIREMENT CANONICAL / PROPOSED / UNKNOWN`
- `GATE AUTHORIZED / NOT AUTHORIZED`
- `IMPLEMENTATION NOT STARTED / IMPLEMENTED / TESTED / VISUALLY VERIFIED`
- `OWNER ACCEPTED / NOT ACCEPTED`

A passing build/test suite is not visual acceptance. A fixture-only demo is not backend-integrated. If browser/iPhone validation was not executed, state `NOT TESTED` explicitly.

## 11 — Resolution of AUD-01 findings

| Finding | Disposition in GOV-02 | Residual condition |
|---|---|---|
| F01 Duplicate IDs | Effective registry and BASE-* aliases established | Approved and applied |
| F02 Gate authorization | Explicit authorization model for every gate | Approved; no coding until separately authorized |
| F03 CDE-01 location | `01_GOVERNANCE.md` designated normative source | Verified and recorded |
| F04 Covers/menus | Preserve as required; specific visual authority remains open | **OPEN** before G3 acceptance |
| F05 Mixed approval states | Four distinct status dimensions defined | Each document/gate needs actual signoff |
| F06 Stale register | Targeted D-001 and D-012–D-015 corrections applied | Registry and decision records reconciled |
| F07 G0/G1 scope | Explicit split established | Approved and recorded |
| F08 Missing mockups | Reference-manifest process established | **OPEN** until evidence supplied |
| F09 Demo vs operational | Evidence vocabulary and backend boundary clarified | Remains enforced through all gates |

## 12 — Acceptance checklist for GOV-02

- [x] Owner approves the effective IDs and specialist precedence.
- [x] Owner approves supersession of implicit G0 authorization.
- [x] Owner approves G0/G1 deliverable split.
- [x] CDE-01 authoritative location and version verified and recorded.
- [x] `00_README.md` and `11_DECISION_REGISTER.md` patched after approval, with this reconciliation record.
- [x] CTM requirements reference effective IDs and physical filenames without ambiguity.
- [x] No code, packages, backend or deployment work undertaken as part of document reconciliation.

**Reconciliation result:** GOV-02 is approved as the governing documentation-reconciliation contract. This approval is **not** authorization to begin G0 or any other implementation gate.
