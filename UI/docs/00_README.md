# BR OS Design System — Contract Registry

**Version:** 1.0.0-draft  
**Status:** FOUNDATION / DOCUMENTARY RECONCILIATION APPROVED; IMPLEMENTATION NOT AUTHORIZED  
**Owner of product decisions:** BR OS project owner  
**Implementation agent:** New Codex session (not authorized to change product canon)

## Purpose
Build a standalone, iPhone-first, React/TypeScript/Tailwind CSS v4 **design system and interactive prototype**, not a reskin of the legacy BR OS application. The deliverable is a verifiable UI system before backend integration.

## Authority and precedence
1. Owner's explicit, current product decisions and approved visual references (when supplied).
2. Owner-approved CDE-01 principles governing controlled design evolution.
3. Owner-approved GOV-02 for contract identity, precedence, conflict handling and authorization.
4. Applicable approved specialist contracts within their scopes.
5. Foundational contracts where non-conflicting and not superseded.
6. Accepted change records.
7. Proposed technical implementation details and agent assumptions (never normative).

If sources conflict, **stop and report the conflict**. Do not silently improvise. Never claim screenshots or mockups are in the repository unless actually provided and inspected.

## Status vocabulary
- **CANONICAL**: previously approved product requirement; implementation must conform.
- **PROPOSED**: recommendation requiring owner approval before being frozen.
- **ACCEPTANCE**: observable evidence required to pass.
- **UNKNOWN**: cannot be inferred; ask rather than invent.

## Contract index
| ID | Document | Scope |
|---|---|---|
| GOV-01 | `01_GOVERNANCE.md` | Change control, agent boundaries, proof |
| ARC-01 | `02_ARCHITECTURE.md` | Isolation, framework, project structure |
| BASE-VIS | `03_VISUAL_TOKENS.md` | Foundational palette, typography, visual rules |
| BASE-LAY | `04_LAYOUT_NAVIGATION.md` | Foundational shell, covers, menus, responsive grids |
| BASE-CMP | `05_COMPONENT_LIBRARY.md` | Foundational universal components and states |
| INT-01 | `06_INTERACTION_ACCESSIBILITY.md` | Touch, overlays, navigation, a11y |
| DOM-01 | `07_MODULE_CONTRACTS.md` | Five footer environments and sample UI |
| DAT-01 | `08_DATA_BOUNDARIES.md` | Fixtures, data semantics, backend handoff |
| QUA-01 | `09_ACCEPTANCE_GATES.md` | Demonstrable test and signoff gates |
| BASE-EXE | `10_CODEX_EXECUTION.md` | Foundational instructions for fresh Codex agent |
| DEC-01 | `11_DECISION_REGISTER.md` | Open decisions and freeze mechanism |
| VIS-01 | `VIS-01_VISUAL_FOUNDATION.md` | Specialist visual foundation and token contract |
| LAY-01 | `LAY-01_APPLICATION_SHELL.md` | Specialist shell, covers, menus and responsive grid |
| CMP-01 | `CMP-01_UNIVERSAL_COMPONENT_ARCHITECTURE.md` | Specialist universal component architecture |
| EXE-01 | `EXE-01_IMPLEMENTATION_ACCEPTANCE_PROTOCOL.md` | Specialist execution and acceptance protocol |
| AUD-01 | `AUD-01_CONTRACT_CONSISTENCY_READINESS.md` | Informative consistency audit |
| GOV-02 | `GOV-02_CONTRACT_AUTHORITY_PRECEDENCE.md` | Approved documentary precedence and reconciliation |

## Required sequence
1. Read contracts; identify conflicts and unknowns.
2. Obtain explicit owner authorization for the named implementation gate.
3. Execute only that gate, then report evidence and stop for owner acceptance.
4. Build tokens + catalog at G1 and obtain owner approval.
5. Build primitives + mobile shell and obtain owner approval.
6. Compose five modules from approved primitives and obtain owner approval.
7. Freeze the design system and only then plan backend integration.

**A passing build is not acceptance.** A working iPhone-sized interactive demonstration is mandatory at every relevant gate.
