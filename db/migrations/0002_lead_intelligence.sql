ALTER TABLE leads ADD COLUMN is_hot INTEGER NOT NULL DEFAULT 0 CHECK (is_hot IN (0, 1));
ALTER TABLE leads ADD COLUMN occupancy_count INTEGER CHECK (occupancy_count IS NULL OR occupancy_count > 0);
ALTER TABLE leads ADD COLUMN last_meaningful_interaction_at TEXT;

CREATE TABLE IF NOT EXISTS lead_unit_interests (
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  interest_type TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (interest_type IN ('PRIMARY', 'ALTERNATIVE')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (lead_id, unit_id)
);
CREATE TABLE IF NOT EXISTS lead_objections (
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  objection TEXT NOT NULL CHECK (objection IN ('NO_VIEW', 'TOO_SMALL', 'TOO_DARK', 'WANTS_VIEW', 'WANTS_QUIET', 'PRICE', 'SHORT_STAY', 'OTHER')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (lead_id, objection)
);
CREATE INDEX IF NOT EXISTS idx_leads_hot_status ON leads(is_hot, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_leads_meaningful ON leads(last_meaningful_interaction_at);
CREATE INDEX IF NOT EXISTS idx_lead_unit_interests_unit ON lead_unit_interests(unit_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_objections_lead ON lead_objections(lead_id, objection);
