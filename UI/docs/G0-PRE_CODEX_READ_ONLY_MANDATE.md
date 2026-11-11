# G0-PRE — Codex Read-Only Contract & Environment Inspection Mandate

**Project:** BR OS Design System  
**Version:** 1.0.0  
**Status:** OWNER-REVIEW / EXECUTION MANDATE  
**Authorized scope:** Inspection and reporting only  
**Target root:** `D:\Boutique rooms\br-os-design-system`  
**Contracts:** `D:\Boutique rooms\br-os-design-system\docs`  
**Legacy reference:** `D:\Boutique rooms\boutique-rooms-os` (read-only; only if present)

## 1. Role and objective

Act as a senior enterprise frontend architect, design-system engineer, contract auditor, and mobile-first UI quality lead. Your immediate assignment is **not to implement** BR OS. Inspect the existing documents and local environment, establish what is actually present, and report whether the isolated project is ready for a separately authorized Gate 0.

The intended product is a mobile-first operational web application with native-app-quality smartphone interaction, five operational environments (LISTING, PEOPLE, DASHBOARD, CALENDAR, SERVICES), compact adaptive grids, icon-first navigation, no conventional persistent header, universal components, and a consistent Tailwind CSS v4 token system. This paragraph is orientation, **not permission to override the written contracts**.

## 2. Absolute operating restrictions

**READ-ONLY. DO NOT:**

- Create, edit, rename, delete, or format any project or documentation file.
- Initialize a repository, install packages, run package-manager commands that mutate files, or generate lockfiles.
- Start development servers, execute migrations, call remote services, authenticate, deploy, commit, push, or modify Git state.
- Modify the legacy application, backend, Cloudflare resources, D1 databases, or any production environment.
- Begin Gate 0, Gate 1, UI implementation, CSS work, refactoring, or automated contract reconciliation.
- Treat passing tests, previous reports, or file titles as proof of actual implementation.

Use only non-mutating directory listings, file reads, and safe inspection commands. If an inspection command could write a cache or generated artifact, do not run it. If a file or directory is missing or inaccessible, report that explicitly; do not create it.

## 3. Sources and precedence

1. Inventory every `.md` file physically present in `docs/`; do not assume the list below is complete.
2. Read the initial contract set (`00_README.md` through `11_DECISION_REGISTER.md`) and the specialist documents if present: `VIS-01_VISUAL_FOUNDATION.md`, `LAY-01_APPLICATION_SHELL.md`, `CMP-01_UNIVERSAL_COMPONENT_ARCHITECTURE.md`, `EXE-01_IMPLEMENTATION_ACCEPTANCE_PROTOCOL.md`, `AUD-01_CONTRACT_CONSISTENCY_READINESS.md`, `GOV-02_CONTRACT_AUTHORITY_PRECEDENCE.md`.
3. Verify the **actual contents**, versions, statuses, dependencies, and explicit approval language; do not infer approval from a filename or its presence.
4. Apply the precedence procedure stated in GOV-02 **if the file exists and its provisions are internally coherent**. If GOV-02 conflicts with an earlier document or is only a review candidate, flag the authority issue rather than silently resolving it.
5. Treat the full approved **CDE-01 — Controlled Design Evolution** clause in `01_GOVERNANCE.md` as the intended normative source. Treat `11_DECISION_REGISTER.md` as its record, not an independently editable second authority. Verify whether both contain the full clause and identify any textual differences.
6. Distinguish **CANONICAL**, **PROPOSED**, **UNKNOWN**, **REVIEW CANDIDATE**, and **OWNER-APPROVED**. Do not silently promote proposed choices to canonical requirements.
7. Where contracts conflict, quote short exact passages with paths and section identifiers. Propose a resolution in the report, but **do not change any file**.

## 4. Inspection work packages

### A. File inventory and integrity

- Confirm the target root and `docs/` exist.
- List actual Markdown documents, file sizes, and whether each is readable.
- Identify missing, duplicated, renamed, or unexpectedly placed documents.
- Check whether a project scaffold, package manifests, Tailwind configuration, or Git repository already exists, without modifying them.
- Identify whether the new root imports or references legacy frontend code; distinguish actual imports from documentation references.

### B. Contract authority audit

- Map each document's identifier, title, version, status, subject, and governing references.
- Verify CDE-01 source/registry alignment.
- Identify duplicated identifiers (including initial contracts versus specialist VIS/LAY/CMP/EXE references).
- Check authorization language for G0-PRE, G0, G1, and later gates.
- Check that GOV-02 and AUD-01 recommendations are not incorrectly treated as already executed corrections.
- Flag any unresolved owner decision that would block Gate 0, and separately any decisions that can safely wait for later gates.

### C. Architecture and UI concept consistency

Assess consistency, without designing or coding, for:

- React/TypeScript/Vite and Tailwind CSS v4 CSS-first architecture.
- Isolation from the old frontend and backend.
- Token authority, semantic color roles, typography, iconography, and component API conventions.
- Headerless mobile application shell; five equal footer destinations; covers and contextual menus.
- Adaptive width-aware grids, safe areas, touch interaction, density, and accessibility.
- UniversalField, SearchField, date/time wheels, Universal Lightbox, and shared operational components.
- Mock-data-only UI before backend integration.
- Browser/iPhone visual acceptance and evidence-based gate approvals.

Do not invent missing screen compositions or assert that unverified mockups are accessible.

### D. Environment readiness (read-only)

Inspect the availability of relevant executables and their versions **only through commands that do not install, mutate, or start services** (for example, `node --version`, `npm --version`, `git --version` if available). Report OS/shell context, repository state, and any obvious blockers. Do not use commands that can modify project files or local configuration.

## 5. Required response format

Return a single, structured report **in the Codex chat response only**; do not create a report file.

1. **Executive verdict:** `READY FOR G0`, `READY WITH DOCUMENTARY CONDITIONS`, or `BLOCKED`, with a concise explanation. This is a recommendation, **not owner approval**.
2. **Actual file inventory:** table of filenames, status/readability, and anomalies.
3. **Contract authority matrix:** identifier, authoritative path, status, and collision/precedence notes.
4. **Findings:** numbered `P0`/`P1`/`P2`, each with exact source path/section, observed evidence, impact, and **proposed** remedy.
5. **CDE-01 comparison:** confirm whether governance and decision-register copies are identical; identify any differences.
6. **Environment summary:** tools and scaffold present/absent, with inspection limitations.
7. **Gate 0 prerequisites:** the **minimum** actions requiring owner authorization; distinguish documentary corrections from implementation tasks.
8. **Explicit non-actions:** confirm no files changed, no installs, no services started, no deployment, no legacy/backend mutation. If any restriction could not be honored, disclose it.
9. **Open decisions:** only questions genuinely necessary before Gate 0; do not ask about later-stage cosmetic choices.

Use `NOT VERIFIED` whenever evidence is insufficient. Do not fabricate test results or declare visual acceptance.

## 6. Stop condition

Stop after the report. **Do not proceed to any implementation gate, even if the audit finds the project ready.** Wait for explicit owner authorization in a subsequent instruction.
