CREATE TABLE IF NOT EXISTS mutation_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  actor TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS','SUCCEEDED','FAILED')),
  response_status INTEGER,
  response_json TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (actor, operation, idempotency_key),
  CHECK (response_json IS NULL OR length(response_json) <= 200000)
);
CREATE INDEX IF NOT EXISTS idx_mutation_requests_created_at ON mutation_requests(created_at);
