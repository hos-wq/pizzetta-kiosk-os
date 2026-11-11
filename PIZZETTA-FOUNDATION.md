# PIZZETTA — Foundation Setup

Pizzetta Kiosk is a standalone restaurant ordering and operations system. The active build contains only Pizzetta customer, staff, menu, branch, order and loyalty behavior.

Legacy material is retained only under `legacy-reference/archive/` for historical traceability. It is not an application dependency, test target, deployment input or data source.

## Active boundaries

- Customer WAP/PWA: `apps/web/src/PizzettaWorldApp.tsx`
- Staff WAP: `apps/web/src/StaffAccess.tsx` and `apps/web/src/StaffConsole.tsx`
- Worker entrypoint: `apps/worker/src/pizzetta-index-v3.ts`
- Pizzetta migrations: `db/pizzetta-migrations/`
- Pizzetta public assets: `apps/web/public/`
- Pizzetta configuration: `wrangler.toml`

## P0 rule

No active source, test, build script, migration or deployment configuration may import, execute or reference another product. Any historical material belongs in `legacy-reference/archive/` and must never be added to the active dependency graph.

## Reuse first

- React/Vite web application structure.
- Worker/API and relational database organization.
- Shared contracts and validation patterns.
- Design System token/component/layout structure.
- Migration, seed, audit, idempotency, build, and verification conventions.

## Replace deliberately

- Rental/property pages and terminology.
- Room, tenant, maintenance, tenancy, utilities, and rental finance domains.
- Any previous property-brand colors, typography, imagery, and voice.
- Navigation and page composition.
- Authentication and roles, after restaurant staff and management roles are defined.

## Target product surfaces

1. Customer WAP: menu, branch selection, pickup/dine-in, ASAP/scheduled order, checkout, loyalty, and status.
2. Restaurant operations: incoming orders, accept/reject, preparation queue, ready/completed, pause/busy mode, and item availability.
3. Totem mode: large touch UI using the same menu/cart/order contracts, with kiosk branch assignment and session reset.
4. Management: branches, menu publication, hours, preparation rules, loyalty rules, and reporting.

## First implementation sequence

1. Inventory the provided menu/item database and map it to categories, products, modifiers, prices, and availability.
2. Define the restaurant domain contracts and order lifecycle.
3. Replace the active navigation and page shell with the restaurant surfaces.
4. Apply the new PIZZETTA brand tokens and typography.
5. Add branches, maps-assisted branch selection, timing/slot rules, loyalty ledger, and order operations.
6. Verify phone ordering, totem ordering, restaurant receiving, scheduled orders, unavailable items, and customer memory.

No package installation has been performed yet. The dependency installation command will be supplied explicitly before it is needed.
