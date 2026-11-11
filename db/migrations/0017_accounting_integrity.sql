CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_one_reversal ON journal_entries(reversal_of) WHERE reversal_of IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_journal_posted_balance
AFTER UPDATE OF status ON journal_entries
WHEN NEW.status = 'POSTED'
BEGIN
  SELECT CASE WHEN
    (SELECT COALESCE(SUM(debit_centavos), 0) FROM journal_lines WHERE entry_id = NEW.id) !=
    (SELECT COALESCE(SUM(credit_centavos), 0) FROM journal_lines WHERE entry_id = NEW.id)
    OR (SELECT COUNT(*) FROM journal_lines WHERE entry_id = NEW.id) < 2
    THEN RAISE(ABORT, 'posted journal entry must be balanced') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_journal_insert_posted_balance
AFTER INSERT ON journal_entries
WHEN NEW.status = 'POSTED'
BEGIN
  SELECT CASE WHEN
    (SELECT COALESCE(SUM(debit_centavos), 0) FROM journal_lines WHERE entry_id = NEW.id) !=
    (SELECT COALESCE(SUM(credit_centavos), 0) FROM journal_lines WHERE entry_id = NEW.id)
    OR (SELECT COUNT(*) FROM journal_lines WHERE entry_id = NEW.id) < 2
    THEN RAISE(ABORT, 'posted journal entry must be balanced') END;
END;
