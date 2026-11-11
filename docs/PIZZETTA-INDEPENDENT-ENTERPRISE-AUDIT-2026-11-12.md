# PIZZETTA KIOSK — Independent Enterprise Audit

Date: 12 November 2026 (Asia/Manila)  
Role: independent Lead Arkitekt / forensic debugger  
Scope: repository, runtime architecture, kiosk UX, data/security boundaries, free-service strategy

## Executive verdict

The Pizzetta ordering slice is a credible prototype, not yet an enterprise-ready kiosk platform. The most important issue is structural: the repository is not cleanly independent. It contains Boutique Rooms code, tests, data seeds and configuration alongside Pizzetta. This is a release-blocking integrity defect, even when the Pizzetta Worker entrypoint itself is separate.

Current release state: **NO-GO**.

The correct next move is a clean Pizzetta repository boundary, followed by a real-time branch/order architecture and a contract-driven kiosk UX. Do not add more features to the mixed tree until the boundary is repaired.

## Evidence observed locally

- Pizzetta Worker entrypoint: `apps/worker/src/pizzetta-index-v3.ts`.
- Pizzetta migrations: `db/pizzetta-migrations/`.
- Mixed legacy material still present: `apps/worker/src/index.ts`, `apps/worker/src/auth.ts`, `apps/worker/src/accounting.ts`, `db/migrations/`, `db/migrations-rc/`, `data/seed/br-os-*`, `packages/domain/`, and many Boutique Rooms tests.
- `npm run typecheck`: passed.
- `npm test`: 50 test files passed, 4 failed; 316 tests passed, 12 failed.
- Failed tests reference missing Boutique Rooms assets/config (`wrangler.rc.toml`, `/privacy/index.html`, `/terms/index.html`, `/data-deletion/index.html`, `sw-v2.js`, V2 route assertions). These are contamination failures, not evidence that Pizzetta is release-ready.
- Frontend build and Worker dry-run passed locally.
- Production deploy has repeatedly hit Cloudflare D1 version-generation error `10021`; the code is not independently certified live after the recent loyalty changes.
- Current customer/staff synchronization uses 7–10 second polling, not a real-time transport.
- Map UX currently opens OpenStreetMap links; there is no embedded vector map, route geometry, map state cache or branch map interaction.
- `ENVIRONMENT = "local"` is still in the main Wrangler configuration; production observability would be misleading.

## Severity-ranked findings

### P0 — repository contamination / release integrity

Pizzetta and Boutique Rooms are mixed in one tree. This creates accidental imports, wrong tests, wrong legal assets, wrong config assumptions and credential leakage risk. Create a clean Pizzetta repository or remove all BR-only material after a verified inventory. Do not delete blindly; archive outside the application repository first.

### P0 — production configuration ambiguity

The main config declares `ENVIRONMENT = "local"` and includes production OAuth values. Use separate `wrangler.local.toml`, `wrangler.preview.toml` and `wrangler.production.toml`, with secrets only in Wrangler/Cloudflare secret storage. Add a boot-time config invariant that refuses a production deploy with `ENVIRONMENT=local`.

### P1 — customer identity is not yet a complete order invariant

Loyalty requires an authenticated `customer_id` on the order. The new Worker path injects the authenticated customer identity for order requests, but this path is not yet deployed or covered by a Pizzetta-specific integration test. A customer must never be able to submit a different customer ID from the browser.

### P1 — real-time order operations are polling-only

The customer polls every 7 seconds and the staff console every 10 seconds. This wastes requests, creates race windows and is not suitable for a busy branch. Polling is a fallback, not the primary event transport.

### P1 — loyalty reward redemption needs a cashier-facing state machine

The reward catalog now models 3rd/6th/9th/12th milestones and the minimum ₱299 qualifying subtotal. The cashier redemption API exists in the working tree, but the staff UI and full redemption tests are incomplete. Free-pizza rewards must require the matching classic size in the order; no silent discount is acceptable.

### P1 — payment semantics are not yet simplified in the schema

The application no longer needs online payment or receipt uploads. The old `payment_proofs` table and historical `PROOF_SUBMITTED` status remain in migrations. Keep historical migrations immutable, but introduce a clean current payment contract: `CASH | GCASH`, `payment_location=BRANCH`, `payment_status=UNPAID|COLLECTED|VOIDED`.

### P1 — legal/PWA asset contract is inconsistent

The current Worker serves `privacy.html` and `data-deletion.html`, while the inherited tests expect directory-index legal pages and a V2 service worker. Pizzetta needs its own legal route test suite and one manifest/service-worker contract per client surface.

### P2 — order access token can appear in a URL

The order endpoint accepts `?access_token=`. Tokens in URLs can leak through browser history, analytics, logs and referrers. Keep the HttpOnly request cookie/header path and deprecate query-token access after migration.

### P2 — menu pricing and reward rules need server-side preview

The client currently builds its menu from static product data while the Worker validates D1 menu data. This can create price/variant drift. The client should render the server menu contract and call a server-side checkout preview before submit, including loyalty discount and reward eligibility.

### P2 — accessibility is not yet kiosk-grade

The product has a good card-based visual direction, but no release evidence exists for keyboard order, screen reader announcements, 200% text zoom, reach mode, reduced motion, touch target sizing or timeout recovery. These are core kiosk functions, not polish.

## Target architecture: smallest enterprise-grade shape

```text
Pizzetta Client WAP/PWA ─┐
Pizzetta Staff WAP ──────┼─> Cloudflare Worker API /api/v1
                         │        ├─ D1: canonical orders/menu/loyalty
                         │        ├─ Durable Object per branch: live fanout + presence
                         │        ├─ Queue: notifications, audit, retry/DLQ
                         │        └─ Static Assets: menu artwork, manifests, legal pages
                         └─ MapLibre client + permitted vector/raster tile provider
```

Use one canonical domain model and two authorized projections: customer and staff. The branch Durable Object is the coordination point for live order events; D1 remains the source of truth. Every mutation writes an idempotent event with `event_id`, `order_id`, `branch_id`, actor, previous version and new version. Clients reconnect with `last_event_id`; if they miss events, they refetch the authoritative order snapshot.

## Free-first technology strategy

| Capability | Recommended | Why | Constraint |
|---|---|---|---|
| API/edge | Cloudflare Workers Free | Keep current deployment model and low latency | 100,000 requests/day and 10 ms CPU on Free |
| SQL | Cloudflare D1 | Existing schema and migrations remain useful | Free limits can stop queries when exceeded |
| Real-time | Durable Objects WebSocket hibernation | One branch = one coordination actor; reconnectable live updates | Requires a new binding and event protocol |
| Async work | Cloudflare Queues + DLQ | Notification fanout, audit, retry without blocking checkout | Design idempotent consumers |
| Assets | Workers Static Assets | Menu images and PWA assets without R2 dependency | Keep images optimized and versioned |
| Map rendering | MapLibre GL JS | Open-source WebGL/vector rendering, branch overlays and route line | Tile provider terms still apply |
| Map data | OSM-derived provider or self-hosted vector tiles | Avoid overloading OSM standard tiles | OSM standard raster tiles are best-effort and not an offline/commercial SLA |
| Auth | Existing Google/Meta OAuth + staff password session | No new paid identity vendor required | Add CSRF, rotation, lockout and audit events |
| Notifications | Web Push + in-app event sound | Free browser-native path | Sound requires a user gesture; iOS support must be tested per device |
| CI | GitHub Actions | Build, typecheck, migration lint, contract tests on every push | Public repository minutes are limited but adequate for this scope |
| Monitoring | Cloudflare dashboard/logs first; optional Sentry free tier later | Start without another vendor | Define P95 latency, event lag, failed orders and stale queue alerts |

Cloudflare documents Workers Free at 100,000 requests/day and 10 ms CPU per request; D1 Free is intended for prototyping but rejects queries after included daily/storage limits. Durable Objects support hibernating WebSockets, and Queues provide delivery, retry, batching and dead-letter behavior. These are the correct primitives for this product, not a second paid backend.

## Kiosk UX findings from the strongest reference patterns

The current Pizzetta layout is directionally correct: dining mode first, category rail, item canvas, persistent cart. Toast documents the same high-value flow plus item detail panes, loyalty, upsells, cash handoff and offline behavior. Square emphasizes fast completion, configurable upsells, real-time availability and kitchen synchronization. McDonald's documents accessibility modes such as reach/magnification and crew assistance, plus QR-based reward redemption at kiosks.

The Pizzetta target should therefore implement:

1. **Start**: Pickup/Dine-in cards; branch selection only when needed.
2. **Browse**: persistent category rail; one-tap add; item detail drawer; clear allergens.
3. **Compose**: variant, add-ons and notes in one drawer; never hide required choices.
4. **Cart**: always visible; one deliberate upsell slot, then stop.
5. **Review**: server-calculated receipt, loyalty eligibility, payment-at-branch choice.
6. **Confirm**: request accepted by branch; no false “order confirmed” state.
7. **Track**: live event timeline, ETA, branch distance and recovery after reload.
8. **Assist**: reach mode, text-size mode, crew-help escape path, timeout/reset after inactivity.

Avoid voice AI for now. Touch-first deterministic flows are more reliable in restaurant noise and easier to audit.

## Required acceptance gates before “enterprise ready”

- Clean repository contains no BR-only code, test, config or data.
- `npm test` is green with Pizzetta-only tests.
- Pizzetta contract tests cover guest, Google customer, Meta customer, staff roles, branch isolation and loyalty milestones.
- Checkout preview and order creation use the same server pricing function.
- Reward redemption is atomic and idempotent; double-tap cannot redeem twice.
- Live events reconnect and reconcile from D1 snapshot.
- PWA manifests, service worker, legal pages and route tests agree.
- Production config cannot carry `ENVIRONMENT=local`.
- Map provider attribution, caching and usage terms are documented.
- WCAG 2.2 keyboard, screen-reader, contrast, zoom, reach and reduced-motion checks pass.

## Recommended execution sequence

1. **Repository quarantine and split** — P0. Inventory, archive, clean tree, new Pizzetta-only test config.
2. **Contract hardening** — P0/P1. API v1 schemas, checkout preview, server menu source, payment simplification.
3. **Live branch actor** — P1. Durable Object WebSocket, event IDs, reconnect and fallback polling.
4. **Loyalty redemption** — P1. Staff UI, selected classic pizza, atomic reward consumption, tests.
5. **Kiosk accessibility and recovery** — P1. reach mode, zoom, reset, keyboard/screen reader, offline-safe shell.
6. **Map upgrade** — P2. MapLibre, branch overlay, user position, route link, attribution and provider contract.
7. **Release assurance** — P0. clean test suite, preview deploy, smoke/E2E, rollback and monitoring dashboard.

## Audit disposition

This audit is **independent analysis**, not production certification or owner approval. The repository should remain in **NO-GO** until the P0 contamination and configuration findings are closed. The most valuable next action is repository separation, not another visual feature.
