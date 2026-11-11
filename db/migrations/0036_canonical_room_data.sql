CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  stable_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  address_verification TEXT NOT NULL CHECK (address_verification IN ('SUPPLIED','SUPPLIED_NOT_EXTERNALLY_VERIFIED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS room_buildings (
  unit_id TEXT PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE room_master_data ADD COLUMN canonical_display_id TEXT;
ALTER TABLE room_master_data ADD COLUMN physical_unit_number TEXT;
ALTER TABLE room_master_data ADD COLUMN room_type TEXT;
ALTER TABLE room_master_data ADD COLUMN geometry_json TEXT;
ALTER TABLE room_master_data ADD COLUMN declared_occupancy TEXT CHECK (declared_occupancy IS NULL OR declared_occupancy IN ('VACANT','OCCUPIED'));
ALTER TABLE room_master_data ADD COLUMN occupancy_as_of TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_master_canonical_display ON room_master_data(canonical_display_id) WHERE canonical_display_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_master_physical_unit ON room_master_data(physical_unit_number) WHERE physical_unit_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_buildings_building ON room_buildings(building_id);
CREATE TABLE IF NOT EXISTS room_attribute_definitions (
  id TEXT PRIMARY KEY,
  attribute_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('GENERAL','AMENITY','BUILDING','TERMS','UTILITY','OPERATIONS')),
  label TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('TEXT','INTEGER','NUMBER','BOOLEAN','ENUM','JSON')),
  options_json TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS room_attribute_values (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES room_attribute_definitions(id) ON DELETE RESTRICT,
  value_json TEXT,
  source TEXT NOT NULL CHECK (source IN ('CANONICAL_DATASET','OPERATOR','IMPORTED_LEGACY')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (unit_id, definition_id)
);
CREATE INDEX IF NOT EXISTS idx_room_attribute_values_definition ON room_attribute_values(definition_id, value_json);
CREATE TABLE IF NOT EXISTS room_import_conflicts (
  id TEXT PRIMARY KEY,
  import_version TEXT NOT NULL,
  unit_id TEXT,
  canonical_display_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  existing_value_json TEXT,
  incoming_value_json TEXT NOT NULL,
  resolution TEXT NOT NULL CHECK (resolution IN ('PRESERVED_EXISTING','REVIEW_REQUIRED')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_room_import_conflicts_room ON room_import_conflicts(canonical_display_id, created_at);
