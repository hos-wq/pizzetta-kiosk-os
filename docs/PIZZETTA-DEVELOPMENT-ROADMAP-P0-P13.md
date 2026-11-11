# PIZZETTA KIOSK — Development Roadmap P0–P13

Status date: 2026-11-11

This is the delivery control document for the independent Pizzetta Kiosk system. It replaces assumptions from the earlier reference project and tracks what is implemented, what is partial, and the next acceptance gate.

## Current position

The project is no longer at zero. It has a deployed Cloudflare Worker, a D1 schema, three real branches, the approved menu order, customer and staff shells, staff password login, order queue polling, branch pause/wait controls, and the canonical order-state transitions.

The live product is still a pilot: customer order intake does not yet collect the mandatory name and WhatsApp contact, the client does not yet show payment choice before submission, and the staff queue does not yet expose a complete confirmation/reply workflow. Those are the next build slices.

## P0–P13 control table

| Phase | Scope | Status | Exit evidence |
|---|---|---|---|
| P0 | Product framing and commercial boundaries | DONE | Manifest and architecture baseline; pickup/dine-in only, no delivery |
| P1 | Domain, branches, menu, variants and allergens | IN PROGRESS | D1 menu/branch records, real branch addresses, requested category order, 8-inch prices |
| P2 | Service blueprint and customer/staff journey | DONE | Service blueprint with pickup, dine-in, payment and upsell rules |
| P3 | Functional requirements and acceptance criteria | NEXT | Requirements contract for intake, confirmation, notes, payment and loyalty |
| P4 | Non-functional requirements | PARTIAL | Mobile/PWA and polling exist; accessibility, resilience and observability gates remain |
| P5 | Solution architecture | PARTIAL | Worker + D1 + static WAP + auth baseline; request/confirmation boundary still required |
| P6 | Data architecture | PARTIAL | Core orders/events/menu tables exist; intake request and customer contact model required |
| P7 | Order state machine | DONE | RECEIVED → ACCEPTED → PREPARING → READY → COMPLETED; cancellation from RECEIVED/ACCEPTED |
| P8 | API/interface contracts | PARTIAL | Menu, branches, orders, staff queue/operations/status exist; intake/payment contracts incomplete |
| P9 | Authorization and role policy | DONE (policy) / PARTIAL (enforcement) | Role matrix documented; ADMIN/MANAGER/CASHIER route enforcement needs completion |
| P10 | UX, visual system and responsive WAP | PARTIAL | Client/staff PWA shells and Pizzetta styling live; full checkout and tracking UX remains |
| P11 | Delivery and environments | PARTIAL | GitHub repository, Wrangler config, local/remote D1 and Worker deployment working |
| P12 | Verification and release quality | PARTIAL | Build and smoke checks pass; automated end-to-end matrix and regression fixtures remain |
| P13 | Operations and continuous improvement | PARTIAL | Branch pause/wait controls and queue polling exist; audit/runbook/alerts remain |

## Execution order from here

1. P3: define the order-intake contract before an order is created. The client must send customer name, WhatsApp, service mode, branch, schedule/table information, payment method, notes and an idempotency key.
2. P6/P8: add a durable `order_requests` boundary and server-side validation. Only a confirmed request creates the operational order in `RECEIVED`.
3. P10: expose the confirmation receipt, payment choice, mandatory contact fields and the waiting/tracking view.
4. P9: enforce role capabilities server-side, not only in the staff UI.
5. P12: add contract tests for duplicate submission, paused branch, stale version, invalid transition and unauthorized branch access.
6. P13: add event/audit visibility and a small operational runbook for branch staff.

## Next acceptance gate

The next slice is accepted only when a guest can build a cart, submit the required contact details once, review a receipt, choose CASH or GCASH, and receive a single `RECEIVED` order even if the browser retries the request. The staff queue must show the order with its contact and payment method, and a status change must be visible to the customer on the tracking view.

## Explicit non-goals for this release

- No delivery dispatch, rider tracking or delivery fee calculation.
- No online card payment. GCash is recorded as a payment method and proof workflow, not an automatic charge.
- No AI dependency. All recommendations, upsells, state changes and notifications are deterministic scripts.
