CREATE UNIQUE INDEX IF NOT EXISTS idx_room_import_conflict_dedupe ON room_import_conflicts(import_version,unit_id,field_key,incoming_value_json);
