CREATE TABLE IF NOT EXISTS media_records (
  id TEXT PRIMARY KEY,
  cloudinary_asset_id TEXT,
  cloudinary_public_id TEXT,
  reference_url TEXT,
  mime_type TEXT,
  format TEXT,
  width INTEGER,
  height INTEGER,
  byte_size INTEGER,
  purpose TEXT NOT NULL,
  access_class TEXT NOT NULL DEFAULT 'OPERATIONAL' CHECK (access_class IN ('PUBLIC','OPERATIONAL','SENSITIVE')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','REPLACED')),
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE tenancy_documents ADD COLUMN media_id TEXT REFERENCES media_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_entity ON media_records(entity_type, entity_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_purpose ON media_records(purpose, access_class, status);
