CREATE TABLE IF NOT EXISTS tenancy_checkouts (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL UNIQUE REFERENCES tenancies(id) ON DELETE RESTRICT,
  actual_check_out_at TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  room_condition TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS turnover_tasks (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tenancy_id TEXT REFERENCES tenancies(id) ON DELETE SET NULL,
  task_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_blocker INTEGER NOT NULL DEFAULT 1 CHECK (is_blocker IN (0,1)),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DONE')),
  due_at TEXT,
  completed_at TEXT,
  completed_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkouts_tenancy ON tenancy_checkouts(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_turnover_unit_status ON turnover_tasks(unit_id,status,is_blocker,due_at);
