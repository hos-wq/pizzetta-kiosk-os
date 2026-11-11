CREATE TABLE IF NOT EXISTS drive_upload_attempts (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PERSON','TENANCY')),
  entity_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('PERSON_ID_DOCUMENT','TENANCY_CONTRACT')),
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','UPLOADED','COMPLETED','RECONCILE_REQUIRED','FAILED')),
  external_file_id TEXT,
  media_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drive_upload_attempts_status ON drive_upload_attempts(status,updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_drive_upload_attempts_external_file ON drive_upload_attempts(external_file_id) WHERE external_file_id IS NOT NULL;
