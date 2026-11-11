CREATE TABLE IF NOT EXISTS service_catalog_nodes (
  id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('MAINTENANCE','HOUSEKEEPING')),
  level TEXT NOT NULL CHECK (level IN ('MACRO','CATEGORY','OBJECT','ACTION')),
  parent_id TEXT REFERENCES service_catalog_nodes(id),
  node_key TEXT NOT NULL,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(service_type, parent_id, node_key)
);
CREATE INDEX IF NOT EXISTS idx_service_catalog_parent ON service_catalog_nodes(service_type,parent_id,active,level);
ALTER TABLE maintenance_issues ADD COLUMN catalog_macro_id TEXT REFERENCES service_catalog_nodes(id);
ALTER TABLE maintenance_issues ADD COLUMN catalog_category_id TEXT REFERENCES service_catalog_nodes(id);
ALTER TABLE maintenance_issues ADD COLUMN catalog_object_id TEXT REFERENCES service_catalog_nodes(id);
ALTER TABLE maintenance_issues ADD COLUMN catalog_action_id TEXT REFERENCES service_catalog_nodes(id);
CREATE INDEX IF NOT EXISTS idx_service_tasks_catalog ON maintenance_issues(catalog_object_id,catalog_action_id);
