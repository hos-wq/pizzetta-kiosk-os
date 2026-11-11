CREATE TABLE IF NOT EXISTS messaging_signal_definitions (
  signal_key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','INTERESTING','HIGH','URGENT')),
  needs_alan INTEGER NOT NULL DEFAULT 0 CHECK (needs_alan IN (0,1)),
  bot_can_continue INTEGER NOT NULL DEFAULT 1 CHECK (bot_can_continue IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS person_messaging_signals (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  signal_key TEXT NOT NULL REFERENCES messaging_signal_definitions(signal_key) ON DELETE RESTRICT,
  normalized_value TEXT NOT NULL,
  value_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUPERSEDED','RETRACTED')),
  source_channel TEXT NOT NULL,
  source_message_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  UNIQUE(person_id, signal_key, normalized_value, source_message_id)
);
CREATE INDEX IF NOT EXISTS idx_person_messaging_signals_active ON person_messaging_signals(person_id,status,signal_key);

CREATE TABLE IF NOT EXISTS messaging_attention (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  signal_id TEXT REFERENCES person_messaging_signals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  external_conversation_id TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('NORMAL','INTERESTING','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  bot_can_continue INTEGER NOT NULL DEFAULT 1 CHECK (bot_can_continue IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(person_id, external_conversation_id, signal_key, status)
);
CREATE INDEX IF NOT EXISTS idx_messaging_attention_open ON messaging_attention(status,priority,updated_at);

CREATE TABLE IF NOT EXISTS messaging_conversation_controls (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL,
  external_conversation_id TEXT NOT NULL,
  control_mode TEXT NOT NULL DEFAULT 'BOT' CHECK (control_mode IN ('BOT','HUMAN')),
  do_not_auto_reply INTEGER NOT NULL DEFAULT 0 CHECK (do_not_auto_reply IN (0,1)),
  taken_over_by TEXT,
  taken_over_at TEXT,
  returned_by TEXT,
  returned_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(channel, external_conversation_id)
);

CREATE TABLE IF NOT EXISTS messaging_aliases (
  id TEXT PRIMARY KEY,
  signal_key TEXT NOT NULL REFERENCES messaging_signal_definitions(signal_key) ON DELETE RESTRICT,
  alias TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(signal_key,alias,language)
);

CREATE TABLE IF NOT EXISTS messaging_processed_events (
  channel TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  person_id TEXT,
  processed_at TEXT NOT NULL,
  PRIMARY KEY(channel,external_event_id)
);
