CREATE TABLE IF NOT EXISTS tenancy_check_ins (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL UNIQUE REFERENCES tenancies(id) ON DELETE CASCADE,
  actual_check_in_at TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS utility_readings (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('ELECTRICITY', 'WATER')),
  reading_kind TEXT NOT NULL CHECK (reading_kind IN ('OPENING', 'INTERMEDIATE', 'CLOSING')),
  reading_value TEXT NOT NULL CHECK (length(reading_value) > 0),
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenancy_wifi_selections (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  provider TEXT,
  plan_name TEXT NOT NULL,
  speed_mbps INTEGER CHECK (speed_mbps IS NULL OR speed_mbps > 0),
  monthly_amount_centavos INTEGER CHECK (monthly_amount_centavos IS NULL OR monthly_amount_centavos >= 0),
  selected_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (ended_at IS NULL OR selected_at < ended_at)
);

CREATE TABLE IF NOT EXISTS tenancy_documents (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('CONTRACT', 'TENANT_ID', 'OTHER')),
  reference TEXT NOT NULL,
  label TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_check_ins_tenancy ON tenancy_check_ins(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_utility_readings_tenancy ON utility_readings(tenancy_id, utility_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_wifi_tenancy ON tenancy_wifi_selections(tenancy_id, selected_at);
CREATE INDEX IF NOT EXISTS idx_tenancy_documents_tenancy ON tenancy_documents(tenancy_id, document_type);
