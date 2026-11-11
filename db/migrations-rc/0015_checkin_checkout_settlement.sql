ALTER TABLE tenancy_check_ins ADD COLUMN confirmed_at TEXT;
ALTER TABLE tenancy_check_ins ADD COLUMN electricity_reading_id TEXT REFERENCES utility_readings(id) ON DELETE SET NULL;
ALTER TABLE tenancy_check_ins ADD COLUMN water_reading_id TEXT REFERENCES utility_readings(id) ON DELETE SET NULL;
ALTER TABLE tenancy_check_ins ADD COLUMN condition_media_id TEXT REFERENCES media_records(id) ON DELETE SET NULL;
ALTER TABLE tenancy_check_ins ADD COLUMN keys_handed_over INTEGER NOT NULL DEFAULT 0 CHECK (keys_handed_over >= 0 AND keys_handed_over <= 3);
ALTER TABLE tenancy_check_ins ADD COLUMN access_devices TEXT;
ALTER TABLE tenancy_check_ins ADD COLUMN notes TEXT;
ALTER TABLE tenancy_checkouts ADD COLUMN confirmed_at TEXT;
ALTER TABLE tenancy_checkouts ADD COLUMN electricity_reading_id TEXT REFERENCES utility_readings(id) ON DELETE SET NULL;
ALTER TABLE tenancy_checkouts ADD COLUMN water_reading_id TEXT REFERENCES utility_readings(id) ON DELETE SET NULL;
ALTER TABLE tenancy_checkouts ADD COLUMN condition_media_id TEXT REFERENCES media_records(id) ON DELETE SET NULL;
ALTER TABLE tenancy_checkouts ADD COLUMN keys_returned INTEGER CHECK (keys_returned IS NULL OR (keys_returned >= 0 AND keys_returned <= 3));
ALTER TABLE tenancy_checkouts ADD COLUMN access_devices TEXT;
ALTER TABLE tenancy_checkouts ADD COLUMN settlement_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING','APPROVED','POSTED'));
CREATE TABLE IF NOT EXISTS settlement_items (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE RESTRICT,
  item_type TEXT NOT NULL CHECK (item_type IN ('DAMAGE','MISSING_INVENTORY','CLEANING','RESTORATION','OTHER')),
  reason TEXT NOT NULL,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  entity_type TEXT,
  entity_id TEXT,
  evidence_media_id TEXT REFERENCES media_records(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPROVED','REJECTED')),
  approved_by TEXT,
  approved_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_settlement_items_tenancy ON settlement_items(tenancy_id,status);
