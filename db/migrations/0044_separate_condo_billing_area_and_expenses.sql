ALTER TABLE building_dues_rates ADD COLUMN source TEXT;
ALTER TABLE building_dues_rates ADD COLUMN notes TEXT;
ALTER TABLE building_dues_rates ADD COLUMN recorded_at TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN commercial_area_sqm REAL;
ALTER TABLE room_dues_obligations ADD COLUMN condo_billable_area_sqm REAL;
ALTER TABLE room_dues_obligations ADD COLUMN area_source TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE room_dues_obligations ADD COLUMN amount_basis TEXT NOT NULL DEFAULT 'COMMERCIAL_AREA_PROVISIONAL';
ALTER TABLE room_dues_obligations ADD COLUMN assessment_status TEXT NOT NULL DEFAULT 'PROJECTED';
ALTER TABLE room_dues_obligations ADD COLUMN billing_period_start TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN billing_period_end TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN statement_reference TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN payment_due_date TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE room_dues_obligations ADD COLUMN actual_paid_centavos INTEGER;
ALTER TABLE room_dues_obligations ADD COLUMN paid_at TEXT;
ALTER TABLE room_dues_obligations ADD COLUMN adjustment_centavos INTEGER;
ALTER TABLE room_dues_obligations ADD COLUMN notes TEXT;
UPDATE building_dues_rates SET source=COALESCE(source,provenance),notes=COALESCE(notes,'Current owner-supplied condominium dues rate; administrative notice not supplied.'),recorded_at=COALESCE(recorded_at,created_at);
UPDATE room_dues_obligations SET commercial_area_sqm=COALESCE(commercial_area_sqm,floor_area_sqm),area_source=COALESCE(NULLIF(area_source,'UNKNOWN'),'UNKNOWN'),amount_basis='COMMERCIAL_AREA_PROVISIONAL',assessment_status='PROJECTED',payment_status='NOT_APPLICABLE',notes=COALESCE(notes,'Existing obligation retained as a provisional estimate because condominium billable area is not supplied.');
CREATE TABLE IF NOT EXISTS owner_property_expenses (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('CONDOMINIUM_DUES')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  status TEXT NOT NULL CHECK (status IN ('PROJECTED','ASSESSED','PAID','VOID')),
  statement_reference TEXT,
  payment_due_date TEXT,
  actual_paid_centavos INTEGER,
  paid_at TEXT,
  adjustment_centavos INTEGER,
  journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(unit_id, expense_type, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_owner_property_expenses_building_period ON owner_property_expenses(building_id, expense_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_owner_property_expenses_unit_period ON owner_property_expenses(unit_id, expense_type, period_start, period_end);
INSERT OR IGNORE INTO chart_accounts (id,code,name,account_class,active,created_at,updated_at) VALUES ('acct-condo-dues-expense','5000','Condominium Association Dues','EXPENSE',1,'2026-10-15T00:00:00.000Z','2026-10-15T00:00:00.000Z');
