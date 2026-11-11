ALTER TABLE tenancies ADD COLUMN person_id TEXT REFERENCES persons(id) ON DELETE RESTRICT;
ALTER TABLE tenancies ADD COLUMN pdc_required INTEGER NOT NULL DEFAULT 0 CHECK (pdc_required IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_tenancies_person ON tenancies(person_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit_status ON tenancies(unit_id, status, start_at, end_at);
