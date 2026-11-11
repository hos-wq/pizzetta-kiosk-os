ALTER TABLE payments ADD COLUMN journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE RESTRICT;
ALTER TABLE settlement_items ADD COLUMN journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE RESTRICT;
ALTER TABLE tenancy_checkouts ADD COLUMN settlement_journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_journal_entry ON payments(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_items_journal_entry ON settlement_items(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_settlement_journal ON tenancy_checkouts(settlement_journal_entry_id) WHERE settlement_journal_entry_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_payment_paid_requires_journal
AFTER INSERT ON payments
WHEN NEW.status = 'PAID' AND NEW.journal_entry_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'paid payment must reference a journal entry');
END;

CREATE TRIGGER IF NOT EXISTS trg_payment_update_paid_requires_journal
AFTER UPDATE OF status ON payments
WHEN NEW.status = 'PAID' AND NEW.journal_entry_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'paid payment must reference a journal entry');
END;
