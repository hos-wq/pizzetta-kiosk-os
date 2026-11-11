PRAGMA foreign_keys=OFF;
CREATE TABLE utility_readings_new (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT REFERENCES tenancies(id) ON DELETE SET NULL,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('ELECTRICITY', 'WATER')),
  reading_kind TEXT NOT NULL CHECK (reading_kind IN ('OPENING', 'INTERMEDIATE', 'CLOSING')),
  reading_value TEXT NOT NULL CHECK (length(reading_value) > 0),
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO utility_readings_new (id,tenancy_id,unit_id,utility_type,reading_kind,reading_value,recorded_at,created_at)
  SELECT id,tenancy_id,unit_id,utility_type,reading_kind,reading_value,recorded_at,created_at FROM utility_readings;
DROP TABLE utility_readings;
ALTER TABLE utility_readings_new RENAME TO utility_readings;
CREATE INDEX IF NOT EXISTS idx_utility_readings_tenancy ON utility_readings(tenancy_id, utility_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_utility_readings_unit ON utility_readings(unit_id, utility_type, recorded_at);
PRAGMA foreign_keys=ON;
