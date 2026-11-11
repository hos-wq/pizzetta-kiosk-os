CREATE TABLE IF NOT EXISTS operational_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0,1)),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','MEDIUM','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED','CANCELLED')),
  person_id TEXT REFERENCES persons(id) ON DELETE RESTRICT,
  unit_id TEXT REFERENCES units(id) ON DELETE RESTRICT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  completed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_due ON operational_tasks(status,due_at);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_person ON operational_tasks(person_id,due_at);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_unit ON operational_tasks(unit_id,due_at);
