CREATE TABLE IF NOT EXISTS tenancy_terminations (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  effective_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('UPCOMING','ACTIVE')),
  resulting_status TEXT NOT NULL DEFAULT 'TERMINATED' CHECK (resulting_status = 'TERMINATED'),
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (tenancy_id)
);

CREATE INDEX IF NOT EXISTS idx_tenancy_terminations_effective_date ON tenancy_terminations(effective_date);
