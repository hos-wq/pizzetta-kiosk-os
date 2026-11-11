ALTER TABLE tenancy_checkouts ADD COLUMN settlement_state TEXT NOT NULL DEFAULT 'CALCULATED'
  CHECK (settlement_state IN ('CALCULATED','APPROVED','POSTED','PAYMENT_OR_REFUND_PENDING','SETTLED'));

ALTER TABLE drive_upload_attempts ADD COLUMN external_name TEXT;
ALTER TABLE drive_upload_attempts ADD COLUMN external_mime_type TEXT;
ALTER TABLE drive_upload_attempts ADD COLUMN external_size INTEGER;
ALTER TABLE drive_upload_attempts ADD COLUMN external_parent_id TEXT;
ALTER TABLE drive_upload_attempts ADD COLUMN external_reference_url TEXT;

CREATE TABLE IF NOT EXISTS settlement_financial_actions (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE RESTRICT,
  checkout_id TEXT NOT NULL REFERENCES tenancy_checkouts(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type IN ('AMOUNT_DUE_PAYMENT','REFUND')),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','CANCELLED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  payment_id TEXT REFERENCES payments(id) ON DELETE RESTRICT,
  journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_settlement_financial_actions_tenancy ON settlement_financial_actions(tenancy_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_financial_actions_one_kind ON settlement_financial_actions(checkout_id,action_type);

CREATE TRIGGER IF NOT EXISTS trg_posted_journal_line_insert
BEFORE INSERT ON journal_lines
WHEN (SELECT status FROM journal_entries WHERE id = NEW.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_posted_journal_line_update
BEFORE UPDATE ON journal_lines
WHEN (SELECT status FROM journal_entries WHERE id = OLD.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_posted_journal_line_delete
BEFORE DELETE ON journal_lines
WHEN (SELECT status FROM journal_entries WHERE id = OLD.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;
