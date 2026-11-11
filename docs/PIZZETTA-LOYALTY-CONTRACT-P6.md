# PIZZETTA KIOSK — Loyalty Contract P6

## Award rule

- One completed order by an authenticated customer awards one point.
- Guest orders never receive points because there is no durable customer identity.
- Points are awarded by the database completion trigger, not by the browser.
- Duplicate completion events cannot award the same order twice.

## Card presentation

The client loyalty card will show:

```text
CURRENT STAMP: 2 / 3
NEXT AWARD: 1 completed order
LIFETIME STAMPS: 8
```

The card appears after request submission or in the authenticated profile, never as a blocking pre-order gate.

## Redemption rule

Redemption is a separate authenticated action. It must create a negative ledger entry and a matching order discount in one transaction. The browser cannot choose a discount amount.

## Current implementation

- `loyalty_accounts` and `loyalty_ledger` exist.
- Completion trigger awards one point.
- Redemption API and customer loyalty read API remain WIP.
