# Pizzetta Kiosk independence audit

Audit target: `D:\PIZZETTA`

## Executive result

The Pizzetta ordering prototype and `wrangler.pizzetta.toml` are separate, but the copied repository is **not yet cleanly independent**. The active source tree still contains the original Boutique Rooms Worker, BR manifests, BR legal pages, BR tests, BR service-worker caches and legacy Cloudflare configurations.

No Pizzetta code should use the old BR production or RC database IDs, old email, old Cloudinary folders, old domains or old push subjects.

## Pizzetta-owned and safe

- `wrangler.pizzetta.toml` — Worker name `pizzetta-kiosk-os`.
- `db/pizzetta-migrations/` — independent ordering schema and menu seed.
- `apps/web/src/PizzettaWorldApp.tsx` and `PizzettaWorld.css` — customer/totem ordering prototype.
- `apps/web/public/brand/` — Pizzetta brand assets and local fonts.
- `docs/pizzetta-database.md` and this audit.

## High-risk legacy connections found

### Cloudflare

- `wrangler.toml` still points to Worker `boutique-rooms-os` and D1 `b156b6f1-3871-4113-8f46-476c1f97c02d`.
- `wrangler.rc.toml` still points to Worker `boutique-rooms-os-rc` and D1 `5082b4c9-f0f7-43b2-a457-e92c49f7bfc8`.
- These files must not be used for Pizzetta deployment.

### Identity and auth

- `apps/worker/src/auth.ts` and `apps/web/src/v2/auth-bootstrap.ts` contain BR owner assumptions.
- Tests still use `boutiquerooms.makati@gmail.com`.
- The Pizzetta owner email is now configurable through `PIZZETTA_OWNER_EMAIL`, but the copied BR auth surface should not be shipped as the Pizzetta auth surface.

### Worker and integrations

- `apps/worker/src/index.ts` exposes BR routes and reports `boutique-rooms-os` as the health service.
- `apps/worker/src/conversation.ts` contains Boutique Rooms rental language.
- `apps/worker/src/web-push.ts` contains BR notification subjects, labels and email addresses.
- `apps/worker/src/media.ts` defaults to `br-os` Cloudinary folders.
- Messenger, WhatsApp, Drive, Cloudinary and BR operational modules are legacy scope and must not be bound to Pizzetta.

### Frontend identity

- `UI/` is still the copied BR design-system application and contains BR labels/storage keys.
- `apps/web/index.html`, manifests, service workers, legal pages and cached shell names still say Boutique Rooms / BR OS.
- `apps/web/src/App.tsx` still imports legacy V2 and restaurant prototype surfaces in addition to Pizzetta.

### Data and documentation

- `data/seed/` contains BR room and operational datasets.
- `db/migrations/` and `db/migrations-rc/` are BR migrations and must not be applied to the Pizzetta D1 database.
- `BR-OS-APPLICATION-MANIFEST.md`, BR reports and BR tests are reference material only.

## Required isolation actions

1. Make `apps/web/src/PizzettaKioskApp.tsx` the only production frontend entry.
2. Create a Pizzetta-only Worker entry/API; do not deploy `apps/worker/src/index.ts` unchanged.
3. Remove BR database configs from the Pizzetta deployment path.
4. Replace Pizzetta legal pages, manifests, service worker and storage keys.
5. Remove BR auth, messaging, Drive, Cloudinary and rental language from the shipped bundle.
6. Keep the BR material only in a clearly marked archive/reference area, or remove it after an explicit owner-approved deletion decision.
7. Add an automated independence check that fails when forbidden BR identifiers appear in production source/config.

## Actions completed in this audit pass

- Root `wrangler.toml` now points to `pizzetta-kiosk-os` and the Pizzetta migrations directory.
- The old RC Wrangler config was moved to `legacy-reference/wrangler.boutique-rooms.rc.toml` and is not an active deployment config.
- Root and UI package names now identify Pizzetta Kiosk.
- `apps/web/src/App.tsx` now imports only `PizzettaWorldApp`; V2 and the copied BR workspace are no longer part of the frontend entry bundle.
- The frontend now registers `sw-pizzetta.js`, not the BR service workers.
- `apps/worker/src/pizzetta-index.ts` is now the deployment entry and exposes only Pizzetta health, menu, branches and order endpoints.
- The default Wrangler dry-run now binds only the Pizzetta D1 database and Pizzetta assets.
- Legacy BR legal pages, manifests and service workers were moved out of `apps/web/public` into `legacy-reference/public`.
- The rebuilt `apps/web/dist` contains no forbidden BR identifiers.
- The active Pizzetta source/config set has no BR identifiers.

## Remaining isolation work

- Replace the copied BR Worker entry with a Pizzetta-only API entry.
- Replace Pizzetta legal pages and public manifests.
- Remove or archive legacy BR source, tests, seeds and migrations after an explicit owner-approved deletion decision.
- Add a forbidden-reference CI check that fails when BR identifiers enter active production source/config.
