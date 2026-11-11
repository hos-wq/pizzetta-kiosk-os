# DAT-01 — Data, Fixtures & Backend Boundary

**Version:** 1.0.0-draft  
**Status:** CANONICAL separation

## Phase 1 — Design system and interactive prototype
- No Worker/D1/Google OAuth dependencies.
- All preview records come from a single deterministic synthetic fixture store.
- State changes may be local and ephemeral; the UI must disclose **DEMO / NOT PERSISTED**.
- Cross-module projection must derive from the **same** fixture entities; never duplicate room/task/person state in each screen.
- Fixtures must never contain actual tenant details, tokens or production credentials.
- Loading/empty/error states can be demonstrated by explicit fixture controls.

## Domain identities
Canonical units and IDs are specified in DOM-01. Shared person, tenancy, task, utility, calendar-event identities must be modeled explicitly. Derived occupancy and derived service status are not independently editable stored fields.

## Phase 2 — Integration (separate future authorization)
- Map each UI action to existing Worker API contract.
- Verify response schemas and authentication before coding adapters.
- Implement read/write/reload and cross-module consistency tests.
- Never call a module operational until real UI → API → D1 → reload has been observed.
- Preserve production and RC environments; integration plan must be separately reviewed.

## Handoff deliverable
Create a UI-to-domain action matrix: component, action, fixture effect, expected backend endpoint (UNKNOWN until inspected), persistence expectation, error state and acceptance test.
