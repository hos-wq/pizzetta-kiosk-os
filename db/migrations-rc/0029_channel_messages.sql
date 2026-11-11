CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('MESSENGER','WHATSAPP')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  external_account_id TEXT NOT NULL,
  external_conversation_id TEXT NOT NULL,
  external_message_id TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('TEXT','IMAGE','AUDIO','VIDEO','DOCUMENT','LOCATION','UNSUPPORTED')),
  text TEXT,
  author_type TEXT NOT NULL CHECK (author_type IN ('CUSTOMER','BOT','OWNER','SYSTEM')),
  status TEXT NOT NULL CHECK (status IN ('RECEIVED','PROCESSED','SENT','FAILED','UNSUPPORTED')),
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  received_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_external ON conversation_messages(channel,external_account_id,external_message_id,direction) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_person ON conversation_messages(person_id,created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_lead ON conversation_messages(lead_id,created_at);

CREATE TABLE IF NOT EXISTS channel_message_deliveries (
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP')),
  external_account_id TEXT NOT NULL,
  external_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROCESSING','SENT','FAILED','UNCERTAIN')),
  failure_code TEXT,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (channel,external_account_id,external_message_id)
);
