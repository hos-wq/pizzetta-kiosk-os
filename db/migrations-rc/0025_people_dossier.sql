CREATE TABLE IF NOT EXISTS person_labels (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','SYSTEM')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(person_id,label)
);
CREATE INDEX IF NOT EXISTS idx_person_labels_search ON person_labels(label,active,person_id);
CREATE TABLE IF NOT EXISTS person_requirements (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  requirement_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(person_id,requirement_key)
);
CREATE INDEX IF NOT EXISTS idx_person_requirements_person ON person_requirements(person_id,requirement_key);
