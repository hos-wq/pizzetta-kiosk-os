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
