CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS person_external_identities (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('MESSENGER', 'WHATSAPP', 'EMAIL', 'PHONE', 'OTHER')),
  external_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (platform, external_id)
);

CREATE TABLE IF NOT EXISTS person_leads (
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  linked_by TEXT,
  PRIMARY KEY (person_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(display_name, updated_at);
CREATE INDEX IF NOT EXISTS idx_persons_contact ON persons(phone, email);
CREATE INDEX IF NOT EXISTS idx_person_external_person ON person_external_identities(person_id, platform);
CREATE INDEX IF NOT EXISTS idx_person_leads_person ON person_leads(person_id, linked_at);
