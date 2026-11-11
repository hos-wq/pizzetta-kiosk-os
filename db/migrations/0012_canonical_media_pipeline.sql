ALTER TABLE media_records ADD COLUMN provider TEXT NOT NULL DEFAULT 'CLOUDINARY' CHECK (provider IN ('CLOUDINARY','EXTERNAL'));
ALTER TABLE media_records ADD COLUMN retired_at TEXT;
ALTER TABLE media_records ADD COLUMN replaced_by TEXT REFERENCES media_records(id) ON DELETE SET NULL;
ALTER TABLE media_records ADD COLUMN transformation_preset TEXT;
CREATE INDEX IF NOT EXISTS idx_media_provider_status ON media_records(provider, status, created_at);
