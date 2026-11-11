-- Metadata on canonical channel identity; no message-body storage.
ALTER TABLE person_external_identities ADD COLUMN profile_json TEXT;
ALTER TABLE person_external_identities ADD COLUMN profile_synced_at TEXT;
ALTER TABLE person_external_identities ADD COLUMN profile_sync_status TEXT;
ALTER TABLE person_external_identities ADD COLUMN conversation_id TEXT;
ALTER TABLE person_external_identities ADD COLUMN conversation_url TEXT;
