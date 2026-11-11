# PIZZETTA KIOSK — P3 Functional Requirements Contract

## Order intake

An order is created only after the customer reviews a receipt and confirms it. The browser may retry, so every submission carries an idempotency key. A retry returns the original result and never creates a second order.

Required customer fields:

- `customer_name`: 2–80 characters, shown to staff.
- `whatsapp`: normalized Philippine mobile number, shown to staff for legitimate order verification.
- `service_mode`: `PICKUP` or `DINE_IN`.
- `branch_id`: one of the active Pizzetta branches.
- `payment_method`: `CASH` or `GCASH`.

Optional fields:

- `scheduled_for` for a future pickup or dine-in pre-order.
- `table_label` for dine-in when the guest already knows the table.
- item notes and one order-level note.

## Confirmation boundary

The customer sequence is:

1. Build cart and apply deterministic scripted upsells.
2. Show receipt with item snapshots, quantities, notes, subtotal and total.
3. Collect name and WhatsApp contact.
4. Select CASH or GCASH.
5. Submit once with an idempotency key.
6. Show `Awaiting Pizzetta confirmation` until staff accepts or cancels.

The staff sequence is:

1. Receive a persistent queue alert.
2. Review branch, mode, schedule, contact, payment method and notes.
3. Set or adjust the preparation estimate.
4. Accept or cancel with a reason.
5. Move the order through the P7 state machine.

## Acceptance criteria

- Missing name or WhatsApp is rejected before an order is written.
- A paused branch rejects new submissions without changing an existing order.
- Duplicate idempotency keys return the original order.
- Menu prices are read from D1 at submission time; the browser cannot set prices.
- Item ingredient and allergen snapshots are stored on the order line.
- Staff sees the submitted contact and payment method in the queue.
- Customer can reload the browser and recover the active order using the access token cookie/local session.
- Customer receives updates only for accepted and ready milestones; staff receives every operational transition.
