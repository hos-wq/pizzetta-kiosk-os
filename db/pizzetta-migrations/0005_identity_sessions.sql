PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_identities (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('GOOGLE','META')),
  subject TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, subject)
);

CREATE TABLE IF NOT EXISTS auth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('GOOGLE','META')),
  mode TEXT NOT NULL CHECK (mode IN ('CUSTOMER','STAFF')),
  nonce TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('CUSTOMER','STAFF')),
  subject_id TEXT NOT NULL,
  role TEXT,
  branch_id TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_subject ON auth_sessions(subject_type, subject_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_states_expiry ON auth_states(expires_at);
