CREATE TABLE IF NOT EXISTS web_push_vapid_config (
  id TEXT PRIMARY KEY CHECK (id = 'owner-v1'),
  public_key TEXT NOT NULL,
  private_key_ciphertext TEXT NOT NULL,
  private_key_iv TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  endpoint_hash TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  subscription_ciphertext TEXT NOT NULL,
  subscription_iv TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_owner_active
  ON web_push_subscriptions(owner_subject, revoked_at, updated_at);

CREATE TABLE IF NOT EXISTS web_push_deliveries (
  event_key TEXT NOT NULL,
  endpoint_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SENDING', 'SENT', 'FAILED')),
  attempted_at TEXT NOT NULL,
  sent_at TEXT,
  response_status INTEGER,
  PRIMARY KEY (event_key, endpoint_hash)
);
