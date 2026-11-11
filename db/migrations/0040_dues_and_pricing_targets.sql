CREATE TABLE IF NOT EXISTS building_dues_rates (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  rate_centavos_per_sqm INTEGER NOT NULL CHECK (rate_centavos_per_sqm >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  unit TEXT NOT NULL DEFAULT 'SQM_MONTH' CHECK (unit = 'SQM_MONTH'),
  responsibility TEXT NOT NULL DEFAULT 'OWNER' CHECK (responsibility = 'OWNER'),
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (building_id, effective_from),
  CHECK (effective_until IS NULL OR effective_from < effective_until)
);
CREATE INDEX IF NOT EXISTS idx_building_dues_rates_lookup ON building_dues_rates(building_id, effective_from, effective_until);
CREATE TABLE IF NOT EXISTS room_dues_obligations (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  building_dues_rate_id TEXT NOT NULL REFERENCES building_dues_rates(id) ON DELETE RESTRICT,
  floor_area_sqm INTEGER NOT NULL CHECK (floor_area_sqm > 0),
  monthly_amount_centavos INTEGER NOT NULL CHECK (monthly_amount_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  payer TEXT NOT NULL DEFAULT 'OWNER' CHECK (payer = 'OWNER'),
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (unit_id, building_dues_rate_id)
);
CREATE INDEX IF NOT EXISTS idx_room_dues_obligations_rate ON room_dues_obligations(building_dues_rate_id, unit_id);
CREATE TABLE IF NOT EXISTS unit_pricing_targets (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type = 'ASKING_RENT'),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  effective_from TEXT NOT NULL,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (unit_id, target_type, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_unit_pricing_targets_unit ON unit_pricing_targets(unit_id, target_type, effective_from);
