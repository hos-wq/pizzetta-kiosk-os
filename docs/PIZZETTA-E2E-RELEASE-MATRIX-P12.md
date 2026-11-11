# PIZZETTA KIOSK — E2E Release Matrix P12

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| E01 | Guest selects pickup and branch | Menu opens with selected branch | READY |
| E02 | Guest selects dine-in | Dine-in service is retained through checkout | READY |
| E03 | Guest opens product card | Ingredients and allergens are visible | READY |
| E04 | Guest submits without name | Submission is rejected | READY |
| E05 | Guest submits without WhatsApp | Submission is rejected | READY |
| E06 | Guest selects CASH | Request records CASH | READY |
| E07 | Guest selects GCASH | Request records GCASH | READY |
| E08 | Duplicate retry with same idempotency key | No second operational order | READY |
| E09 | Branch is paused | New request is rejected | READY |
| E10 | Staff receives request | Request appears in confirmation queue | READY |
| E11 | Staff confirms request | Operational order becomes RECEIVED | READY |
| E12 | Customer waits for confirmation | Waiting state polls without exposing token | READY |
| E13 | Staff advances order | Customer timeline updates | READY |
| E14 | Staff sends stale version | 409 conflict, no silent overwrite | READY |
| E15 | Guest reloads tracking view | Active request/order can be recovered | READY |
| E16 | Cashier attempts branch operations | Must be rejected server-side | NEXT |
| E17 | iPhone VoiceOver checkout | All controls have meaningful labels | NEXT |
| E18 | Offline/timeout retry | Same request key survives retry | NEXT |

## Release rule

Release P12 only when every `READY` case has automated or recorded evidence and the `NEXT` cases have either passed on a real device or been explicitly accepted as a documented limitation.

## Current automated evidence

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pizzetta-contract-smoke.ps1
```

The current smoke suite covers health, menu, branches, incomplete-request rejection and tracking access denial.
