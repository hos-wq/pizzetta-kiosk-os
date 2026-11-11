ALTER TABLE utility_readings ADD COLUMN context TEXT NOT NULL DEFAULT 'MANUAL' CHECK (context IN ('CHECK_IN','INTERMEDIATE','CHECK_OUT','MANUAL'));
ALTER TABLE utility_readings ADD COLUMN operator_id TEXT;
ALTER TABLE utility_readings ADD COLUMN media_id TEXT REFERENCES media_records(id) ON DELETE SET NULL;
ALTER TABLE tenancies ADD COLUMN billing_frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_frequency IN ('WEEKLY','MONTHLY','CUSTOM'));

CREATE TABLE IF NOT EXISTS utility_rates (
  id TEXT PRIMARY KEY,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('ELECTRICITY','WATER','INTERNET')),
  unit TEXT NOT NULL,
  rate_centavos INTEGER NOT NULL CHECK (rate_centavos >= 0),
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  method TEXT NOT NULL DEFAULT 'UNIT_RATE' CHECK (method IN ('UNIT_RATE','MANUAL_AMOUNT')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  CHECK (effective_until IS NULL OR effective_from < effective_until)
);
CREATE TABLE IF NOT EXISTS utility_charges (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tenancy_id TEXT REFERENCES tenancies(id) ON DELETE SET NULL,
  utility_type TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  previous_reading_id TEXT NOT NULL REFERENCES utility_readings(id) ON DELETE RESTRICT,
  current_reading_id TEXT NOT NULL REFERENCES utility_readings(id) ON DELETE RESTRICT,
  consumption TEXT NOT NULL,
  rate_id TEXT REFERENCES utility_rates(id) ON DELETE RESTRICT,
  amount_centavos INTEGER,
  status TEXT NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED','VOID')),
  created_at TEXT NOT NULL,
  CHECK (period_start < period_end)
);
CREATE INDEX IF NOT EXISTS idx_utility_rates_lookup ON utility_rates(utility_type, effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_utility_charges_unit_period ON utility_charges(unit_id, utility_type, period_start, period_end);
