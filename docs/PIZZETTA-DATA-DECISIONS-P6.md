# PIZZETTA KIOSK — P6 Data Decisions

## Current operational model

D1 is the source of truth for branches, menu categories, menu items, variants, branch availability, orders, order lines, order events, branch operations, staff users and payment proofs. Prices are integer Philippine centavos.

## Required request boundary

The current API writes directly to `orders`. The next migration introduces `order_requests` as a short-lived intake boundary so incomplete or duplicated customer submissions do not become kitchen orders.

`order_requests` will store:

- request id and idempotency key;
- branch, optional customer identity and guest session hash;
- customer name and WhatsApp;
- service mode, schedule and table label;
- payment method;
- serialized receipt totals and request notes;
- lifecycle: `DRAFT`, `SUBMITTED`, `CONFIRMED`, `REJECTED`, `EXPIRED`;
- created/updated timestamps and expiry timestamp.

Only `CONFIRMED` requests create an operational order. The order receives immutable snapshots of menu name, ingredients, allergens, price and quantity.

## Identity and privacy

Guest continuity uses a random browser session token, never a raw IP address. Authenticated customers link the request to their customer identity. WhatsApp is operational contact data and must be visible only to authorized branch staff and the customer who holds the order access token.

## Concurrency rules

- `orders.version` protects staff transitions.
- `branch_operations.version` protects pause and wait-time edits.
- `order_requests.idempotency_key` protects customer retries.
- Every state change is appended to `order_events`.
