CREATE TABLE IF NOT EXISTS utility_services (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('WATER','ELECTRICITY','INTERNET')),
  meter_identifier TEXT,
  average_month TEXT,
  billing TEXT,
  wifi_ready TEXT CHECK (wifi_ready IS NULL OR wifi_ready IN ('TRUE','FALSE','UNKNOWN')),
  monthly_cost_centavos INTEGER CHECK (monthly_cost_centavos IS NULL OR monthly_cost_centavos >= 0),
  provider TEXT,
  connection TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(unit_id, utility_type)
);

ALTER TABLE utility_readings ADD COLUMN meter_event TEXT NOT NULL DEFAULT 'READING' CHECK (meter_event IN ('READING','RESET','REPLACEMENT'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_reading_exact ON utility_readings(unit_id, utility_type, recorded_at, reading_value, meter_event);
CREATE INDEX IF NOT EXISTS idx_utility_service_unit ON utility_services(unit_id, utility_type);
