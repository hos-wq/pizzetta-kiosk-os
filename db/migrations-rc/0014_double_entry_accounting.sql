CREATE TABLE IF NOT EXISTS chart_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_class TEXT NOT NULL CHECK (account_class IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','REVERSED')),
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  tenancy_id TEXT REFERENCES tenancies(id) ON DELETE SET NULL,
  unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
  reversal_of TEXT REFERENCES journal_entries(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  posted_at TEXT
);
CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES chart_accounts(id) ON DELETE RESTRICT,
  debit_centavos INTEGER NOT NULL DEFAULT 0 CHECK (debit_centavos >= 0),
  credit_centavos INTEGER NOT NULL DEFAULT 0 CHECK (credit_centavos >= 0),
  line_description TEXT,
  CHECK ((debit_centavos > 0 AND credit_centavos = 0) OR (credit_centavos > 0 AND debit_centavos = 0))
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date, status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenancy ON journal_entries(tenancy_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);

INSERT OR IGNORE INTO chart_accounts (id,code,name,account_class,created_at,updated_at) VALUES
 ('acct-cash','1000','Cash','ASSET','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-gcash','1010','GCash','ASSET','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-ar-rent','1100','Rent Receivable','ASSET','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-deposit','2100','Security Deposits Held','LIABILITY','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-rent-income','4000','Rental Income','INCOME','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-utility-income','4010','Utility Income','INCOME','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-restoration-income','4020','Cleaning and Restoration Charges','INCOME','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z'),
 ('acct-refund-payable','2200','Tenant Refunds Payable','LIABILITY','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
