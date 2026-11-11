# BASE-EXE — Fresh Codex Session: Foundational Execution Contract

**Version:** 1.0.0-draft  
**Status:** BASELINE agent instructions; authorization wording reconciled by approved GOV-02

## Initial instruction
You are implementing a **new, standalone BR OS Design System**, not repairing the legacy app. Read every file in `docs/` before writing code. Produce a short contract compliance map and list of missing owner decisions. Do not implement any gate until the owner explicitly authorizes that named gate. After authorization, implement only that gate: G0 covers isolated project scaffolding and environment preparation; G1 covers design tokens and the interactive visual gallery. G1 is not authorized by G0.

## Permissions
- **WRITE:** only new design-system directory.
- **READ ONLY:** legacy `D:\Boutique rooms\boutique-rooms-os`, if access is provided.
- **FORBIDDEN:** legacy modifications, remote D1, deploy, OAuth changes, live messages, production credentials, destructive git commands.
- **NO ASSUMED ACCESS:** if paths or approved mockups are missing, report this instead of fabricating them.

## Working discipline
1. State the current contract IDs and acceptance gate.
2. Inspect existing files; do not overwrite undocumented work.
3. Implement smallest coherent increment.
4. Run targeted checks.
5. Show a working visual preview and report its URL/start command.
6. Provide exact deviations and open decisions.
7. **Stop for owner signoff.**

## Required response format
- Gate / scope.
- Files created/modified.
- What is visibly demonstrable.
- Tests executed and limitations.
- Contract compliance/deviations.
- Exact preview commands.
- Questions blocking acceptance.

## Explicit anti-patterns
No generic dashboard template; no old BR OS header; no old Rooms/Leads/More footer; no placeholder pages masquerading as completed modules; no ad-hoc style overrides; no repeated giant audit/test suite when a targeted test suffices; no claim of success without rendered UI evidence.

## First deliverable
For an explicitly authorized G0, establish a clean React/TypeScript/Vite/Tailwind CSS v4 workspace with `docs/`, minimal host/scaffold, contract inventory and traceability evidence. The interactive token gallery is a G1 deliverable and is not implied by G0. Do not build all five modules in the first task.
