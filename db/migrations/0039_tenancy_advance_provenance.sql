ALTER TABLE tenancies ADD COLUMN advance_amount_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (advance_amount_status IN ('DECLARED','UNKNOWN'));
