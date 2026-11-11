PRAGMA foreign_keys=OFF;

ALTER TABLE room_import_conflicts RENAME TO room_import_conflicts_legacy;

CREATE TABLE room_import_conflicts (
  id TEXT PRIMARY KEY,
  import_version TEXT NOT NULL,
  unit_id TEXT,
  canonical_display_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  existing_value_json TEXT,
  incoming_value_json TEXT NOT NULL,
  resolution TEXT NOT NULL CHECK (resolution IN ('PRESERVED_EXISTING','NORMALIZED_CANONICAL','REVIEW_REQUIRED')),
  created_at TEXT NOT NULL
);

INSERT INTO room_import_conflicts (id,import_version,unit_id,canonical_display_id,field_key,existing_value_json,incoming_value_json,resolution,created_at)
SELECT id,import_version,unit_id,canonical_display_id,field_key,existing_value_json,incoming_value_json,
  CASE WHEN field_key='room_type' THEN 'NORMALIZED_CANONICAL' ELSE resolution END,
  created_at
FROM room_import_conflicts_legacy;

DROP TABLE room_import_conflicts_legacy;

CREATE INDEX IF NOT EXISTS idx_room_import_conflicts_room ON room_import_conflicts(canonical_display_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_import_conflict_dedupe ON room_import_conflicts(import_version,unit_id,field_key,incoming_value_json);

PRAGMA foreign_keys=ON;
