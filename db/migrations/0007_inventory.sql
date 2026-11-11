CREATE TABLE IF NOT EXISTS inventory_nodes (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  parent_id TEXT REFERENCES inventory_nodes(id) ON DELETE RESTRICT,
  node_type TEXT NOT NULL CHECK (node_type IN ('LOCATION', 'CATEGORY')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE IF NOT EXISTS inventory_assets (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES inventory_nodes(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  asset_type TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  installed_on TEXT,
  condition TEXT NOT NULL DEFAULT 'GOOD' CHECK (condition IN ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETIRED')),
  notes TEXT,
  retired_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE maintenance_issues ADD COLUMN inventory_asset_id TEXT REFERENCES inventory_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_nodes_unit_parent ON inventory_nodes(unit_id, parent_id, active);
CREATE INDEX IF NOT EXISTS idx_inventory_assets_node_status ON inventory_assets(node_id, status, condition);
CREATE INDEX IF NOT EXISTS idx_inventory_assets_type ON inventory_assets(asset_type, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_inventory_asset ON maintenance_issues(inventory_asset_id);
