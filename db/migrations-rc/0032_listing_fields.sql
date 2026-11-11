CREATE TABLE IF NOT EXISTS room_listing_fields (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL CHECK (field_key GLOB '[a-z][a-z0-9_]*'),
  category TEXT NOT NULL CHECK (category IN ('ROOM_GENERAL','ROOM_AMENITIES','ROOM_BUILDING','TERMS_RENT_DURATION','TERMS_PAYMENT_TERMS','TERMS_HOUSE_RULES','TERMS_CONTRACT_REQUIREMENTS','CUSTOM')),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
  value_type TEXT NOT NULL CHECK (value_type IN ('TEXT','INTEGER','BOOLEAN','ENUM')),
  value_json TEXT,
  options_json TEXT,
  system_defined INTEGER NOT NULL DEFAULT 1 CHECK (system_defined IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (unit_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_room_listing_fields_category ON room_listing_fields(unit_id, category, label);
