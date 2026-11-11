CREATE TABLE IF NOT EXISTS tenancy_contract_versions (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  start_date TEXT NOT NULL,
  end_exclusive TEXT NOT NULL,
  last_occupied_date TEXT NOT NULL,
  monthly_rent_centavos INTEGER NOT NULL CHECK (monthly_rent_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  monthly_due_day INTEGER CHECK (monthly_due_day IS NULL OR monthly_due_day BETWEEN 1 AND 31),
  expected_payment_day INTEGER CHECK (expected_payment_day IS NULL OR expected_payment_day BETWEEN 1 AND 31),
  deposit_centavos INTEGER NOT NULL DEFAULT 0 CHECK (deposit_centavos >= 0),
  minimum_term_exception INTEGER NOT NULL DEFAULT 0 CHECK (minimum_term_exception IN (0,1)),
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenancy_id, version_number),
  UNIQUE (tenancy_id, start_date),
  CHECK (start_date < end_exclusive),
  CHECK (last_occupied_date < end_exclusive)
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_dates ON tenancy_contract_versions(tenancy_id, start_date, end_exclusive);

CREATE TABLE IF NOT EXISTS tenancy_financial_facts (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL CHECK (fact_type IN ('OPENING_BALANCE','SECURITY_DEPOSIT')),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  effective_date TEXT NOT NULL,
  provenance TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenancy_id, fact_type, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_tenancy_financial_facts_tenancy ON tenancy_financial_facts(tenancy_id, effective_date);

CREATE TABLE IF NOT EXISTS building_utility_config (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('ELECTRICITY','WATER','INTERNET')),
  provider TEXT,
  billing_entity TEXT,
  payer TEXT NOT NULL CHECK (payer IN ('TENANT','OWNER','BUILDING_ADMINISTRATION','UNKNOWN')),
  payment_recipient TEXT,
  reading_schedule TEXT,
  usual_due_day INTEGER CHECK (usual_due_day IS NULL OR usual_due_day BETWEEN 1 AND 31),
  due_date_semantics TEXT,
  reconciliation_policy TEXT,
  effective_from TEXT,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (building_id, utility_type)
);

CREATE INDEX IF NOT EXISTS idx_building_utility_config_building ON building_utility_config(building_id, utility_type);

ALTER TABLE utility_rates ADD COLUMN building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE;
ALTER TABLE utility_rates ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP');
ALTER TABLE utility_rates ADD COLUMN provenance TEXT;
CREATE INDEX IF NOT EXISTS idx_utility_rates_building ON utility_rates(building_id, utility_type, effective_from);

CREATE TABLE IF NOT EXISTS property_policies (
  id TEXT PRIMARY KEY,
  policy_key TEXT NOT NULL UNIQUE,
  value_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_policy_values (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  policy_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (unit_id, policy_key)
);

CREATE TABLE IF NOT EXISTS tenancy_document_requirements (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL CHECK (document_key IN ('NOTARIZED_LEASE','VALID_ID')),
  status TEXT NOT NULL CHECK (status IN ('REQUIRED','RECEIVED','VERIFIED')),
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenancy_id, document_key)
);
