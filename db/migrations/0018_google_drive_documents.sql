ALTER TABLE media_records ADD COLUMN external_provider TEXT CHECK (external_provider IS NULL OR external_provider IN ('GOOGLE_DRIVE'));
ALTER TABLE media_records ADD COLUMN external_file_id TEXT;
ALTER TABLE media_records ADD COLUMN external_parent_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_external_file ON media_records(external_provider, external_file_id) WHERE external_provider IS NOT NULL AND external_file_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS drive_connections (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  root_folder_id TEXT,
  root_folder_name TEXT,
  refresh_token_ciphertext TEXT NOT NULL,
  refresh_token_iv TEXT NOT NULL,
  scopes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','ERROR')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS drive_oauth_transactions (
  state_hash TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_drive_oauth_expiry ON drive_oauth_transactions(expires_at, consumed_at);
