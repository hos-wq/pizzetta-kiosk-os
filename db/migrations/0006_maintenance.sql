CREATE TABLE IF NOT EXISTS maintenance_issues (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  area TEXT NOT NULL,
  asset TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('URGENT', 'MEDIUM', 'NORMAL')),
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED')),
  opened_at TEXT NOT NULL,
  resolved_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (resolved_at IS NULL OR opened_at <= resolved_at),
  CHECK (closed_at IS NULL OR opened_at <= closed_at)
);

CREATE TABLE IF NOT EXISTS maintenance_events (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES maintenance_issues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('NOTE', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'AVAILABILITY_CHANGED', 'RESOLVED', 'REOPENED')),
  note TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  actor TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE availability_blocks ADD COLUMN maintenance_issue_id TEXT REFERENCES maintenance_issues(id) ON DELETE SET NULL;
ALTER TABLE availability_blocks ADD COLUMN cancelled_at TEXT;

CREATE INDEX IF NOT EXISTS idx_maintenance_issues_unit_status ON maintenance_issues(unit_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_updated ON maintenance_issues(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_issue ON maintenance_events(issue_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_maintenance_issue ON availability_blocks(maintenance_issue_id);
