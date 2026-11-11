# PIZZETTA KIOSK — Permanent Progress Map P0–P13

Updated: 2026-11-11  
Legend: `DONE` complete · `WIP` in progress · `NEXT` next delivery slice · `BLOCKED` waiting for an external decision or asset

## Global delivery bar

```text
P0  P1  P2  P3  P4  P5  P6  P7  P8  P9  P10 P11 P12 P13
██  ▣   ██  ▣   ▣   ▣   ▣   ██  ▣   ▣   ▣   ▣   ▣   ▣
DONE WIP DONE WIP WIP WIP WIP DONE WIP WIP WIP WIP WIP WIP
```

**Overall:** 4 phases complete · 10 phases active or remaining · current implementation gate: **P6/P8 loyalty, payment-proof and order-operations completion**.

## Node and child-task map

### P0 — Product framing · `DONE`

- `DONE` Pickup and dine-in only
- `DONE` No delivery scope
- `DONE` Customer and staff surfaces defined
- `DONE` Success metrics and commercial boundary recorded

### P1 — Domain and menu · `WIP`

- `DONE` Three real branches in D1
- `DONE` Menu categories and requested item order
- `DONE` 14″ and tray prices
- `DONE` 8″ prices
- `DONE` Thin Crust ingredients/allergens and activation
- `NEXT` Complete authoritative allergen review for remaining menu items

### P2 — Service blueprint · `DONE`

- `DONE` Pickup journey
- `DONE` Dine-in journey
- `DONE` Cart, upsell and receipt rules
- `DONE` Customer/staff responsibilities

### P3 — Functional requirements · `WIP`

- `DONE` Name and WhatsApp requirement documented
- `DONE` CASH/GCASH choice documented
- `DONE` Payment collected at branch; no online payment or receipt upload
- `DONE` Loyalty validation minimum: ₱299 subtotal per completed order
- `DONE` Confirmation boundary documented
- `DONE` Frontend uses order-request endpoint
- `DONE` Schedule and table fields in checkout

### P4 — Non-functional requirements · `NEXT`

- `DONE` iPhone 14 Pro responsive target
- `DONE` PWA shell and route-specific manifests
- `WIP` Accessibility checklist
- `NEXT` Offline/retry policy
- `NEXT` Performance and observability budgets

### P5 — Solution architecture · `WIP`

- `DONE` Cloudflare Worker + D1 + static assets
- `DONE` Separate client and staff routes
- `DONE` Auth/session baseline
- `WIP` Request-to-order event choreography
- `NEXT` Formal API versioning and error taxonomy

### P6 — Data architecture · `WIP`

- `DONE` Menu, branch, order and event tables
- `DONE` Branch operation controls
- `DONE` Payment proof table
- `DONE` `order_requests` boundary
- `WIP` Request confirmation audit events
- `DONE` Loyalty point award trigger on completed authenticated orders
- `DONE` Authenticated loyalty read endpoint
- `DONE` Customer loyalty card in active-order tracking
- `DONE` Three-stamp reward unlock mechanics
- `DONE` Active-order reward availability banner
- `DONE` Reward catalog: 3rd 15%, 6th 30%, 9th free 8″ classic, 12th free 14″ classic
- `DONE` Minimum qualifying subtotal enforced at ₱299
- `WIP` Loyalty reward redemption UX at cashier, including classic-pizza selection for 9th/12th

### P7 — Order state machine · `DONE`

- `DONE` `RECEIVED → ACCEPTED → PREPARING → READY → COMPLETED`
- `DONE` `RECEIVED → CANCELLED`
- `DONE` `ACCEPTED → CANCELLED`
- `DONE` Optimistic version protection
- `NEXT` Automated timer transition policy

### P8 — API and interface contracts · `WIP`

- `DONE` Health, menu and branch endpoints
- `DONE` Direct order endpoint
- `DONE` Order-request creation endpoint
- `DONE` Staff request confirmation endpoint
- `DONE` Staff request queue endpoint/UI
- `DONE` Customer request status polling

### P9 — Authorization · `WIP`

- `DONE` Role matrix: ADMIN, MANAGER, CASHIER, CUSTOMER, GUEST
- `DONE` Staff session login
- `DONE` Server-side capability enforcement by role
- `DONE` Manager/Admin-only operations enforcement
- `DONE` Cashier/Manager/Admin order dispatch enforcement

### P10 — UX and design system · `WIP`

- `DONE` Pizzetta palette and typography direction
- `DONE` Client and staff WAP shells
- `DONE` Item detail cards with ingredients/allergens
- `DONE` Receipt and request-waiting UI
- `DONE` Customer timeline/map/tracking surface
- `DONE` GPS distance and pickup map link

### P11 — Delivery and environments · `WIP`

- `DONE` GitHub repository
- `DONE` Wrangler deployment
- `DONE` Local and remote D1 migrations
- `DONE` Live Worker hostname
- `NEXT` Preview environment and release checklist

### P12 — Verification · `WIP`

- `DONE` Web build
- `DONE` Live health/menu smoke tests
- `DONE` Migration verification
- `DONE` API contract smoke tests
- `NEXT` End-to-end customer/staff test matrix

### P13 — Operations · `WIP`

- `DONE` Branch pause/resume
- `DONE` Wait-time +/- controls
- `DONE` Staff queue polling and notifications
- `DONE` Request confirmation operations
- `DONE` Incident runbook
- `NEXT` Audit dashboard and alerts

## Current critical path

```text
P3 requirements
   └─ P6 order_requests
       └─ P8 staff request queue + confirm
           └─ P10 customer waiting/tracking UI
               └─ P12 end-to-end verification
                   └─ P13 operating runbook
```

## Update rule

Every completed development slice must update this file and the roadmap. A phase changes to `DONE` only when its child tasks have evidence in code, database, tests or a deployed environment.
