# PIZZETTA — Foundation Setup

This project is a restaurant ordering system built from the reusable foundation of `D:\Boutique rooms\boutique-rooms-os`.

## Current state

- The BR OS repository structure has been copied into this directory.
- Source control metadata, installed dependencies, Wrangler state, and local environment secrets were intentionally left out.
- Existing PIZZETTA planning and visual reference files were preserved.
- The copied BR OS code is a starting foundation; rental-specific domain behavior is not yet considered restaurant behavior.

## Reuse first

- React/Vite web application structure.
- Worker/API and relational database organization.
- Shared contracts and validation patterns.
- Design System token/component/layout structure.
- Migration, seed, audit, idempotency, build, and verification conventions.

## Replace deliberately

- Rental/property pages and terminology.
- Room, tenant, maintenance, tenancy, utilities, and rental finance domains.
- BR OS colors, typography, imagery, and brand voice.
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
