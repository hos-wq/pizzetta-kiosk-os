# PIZZETTA KIOSK — Branch Operations Runbook P13

## Scope

This runbook is for Poblacion, Antipolo and BF Homes staff using the Pizzetta staff WAP. It covers pickup and dine-in pre-orders only. Delivery dispatch is outside the system.

## Start of shift

1. Open the staff URL and sign in with the assigned staff account.
2. Select the physical branch.
3. Confirm **NEW ORDERS** is `Open`.
4. Set the realistic preparation time with the `+/-` controls.
5. Confirm the live queue is empty or matches the handover from the previous shift.
6. Keep sound and browser notifications enabled.

## Incoming request procedure

1. A new request appears under **Awaiting confirmation** and remains until actioned.
2. Read the customer name and WhatsApp number back to the caller only when necessary to verify a legitimate order.
3. Check pickup/dine-in, scheduled time, notes, payment method and total.
4. Confirm only when the kitchen can meet the requested time.
5. If the time cannot be met, use the existing WhatsApp contact for a counter-note workflow; do not silently alter the request.
6. After confirmation, advance the operational order through the P7 states.

## Preparation states

```text
RECEIVED   = accepted by the system, waiting for staff action
ACCEPTED   = branch has accepted the request
PREPARING  = kitchen is actively preparing
READY      = customer may collect / dine-in service may proceed
COMPLETED  = handover or table service is complete
```

The staff member must not skip a state except during a documented incident. Every transition is version-protected and recorded in `order_events`.

## Pausing new orders

Use **Pause** when the kitchen cannot safely accept more work, equipment is unavailable, the branch is closing, or a safety issue exists. Existing orders remain visible. Resume only after the branch can honour new preparation estimates.

## Waiting-time changes

- Increase by 5 minutes when the active queue or kitchen load requires it.
- Decrease by 5 minutes only when the kitchen has capacity.
- Never promise a shorter time to a customer while the branch is paused.

## Incident levels

- **L1 — Single order issue:** note the order number, contact the customer, preserve the order state and resolve at branch level.
- **L2 — Branch issue:** pause new orders, record branch and time, preserve existing queue, notify the manager.
- **L3 — Platform issue:** pause new orders, capture the visible error and timestamp, notify the technical owner, and use the branch’s normal phone fallback.

## Privacy and security

- Do not write customer WhatsApp numbers into personal notes or screenshots.
- Do not share order access tokens.
- Staff must use their assigned account; never share credentials.
- A request is confirmed only by authenticated staff with access to that branch.

## End of shift

1. Complete or hand over all active orders.
2. Do not cancel orders simply to clear the queue.
3. Pause new orders if the branch is closed.
4. Record unresolved order numbers and the next responsible staff member.
5. Sign out of the staff WAP on shared devices.

## Evidence to capture during support

- branch
- order/request number
- current state
- exact local time
- visible error text
- whether the branch was paused

Never capture customer access tokens or full payment screenshots in a chat message.
