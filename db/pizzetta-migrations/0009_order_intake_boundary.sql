PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN customer_name TEXT;
ALTER TABLE orders ADD COLUMN whatsapp TEXT;
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  customer_id TEXT REFERENCES customers(id),
  guest_session_hash TEXT,
  customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) BETWEEN 2 AND 80),
  whatsapp TEXT NOT NULL CHECK (length(trim(whatsapp)) BETWEEN 7 AND 32),
  service_mode TEXT NOT NULL CHECK (service_mode IN ('DINE_IN','PICKUP')),
  scheduled_for TEXT,
  table_label TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH','GCASH')),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT','SUBMITTED','CONFIRMED','REJECTED','EXPIRED')),
  receipt_json TEXT NOT NULL,
  notes TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_order_id TEXT REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_order_requests_queue
  ON order_requests(branch_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_order_requests_guest_session
  ON order_requests(guest_session_hash, created_at);
