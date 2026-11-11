PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  actual_unit_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL CHECK (floor > 0),
  type TEXT NOT NULL,
  sqm INTEGER NOT NULL CHECK (sqm > 0),
  monthly_rent_centavos INTEGER NOT NULL CHECK (monthly_rent_centavos >= 0),
  commercial_priority TEXT NOT NULL CHECK (commercial_priority IN ('HIGH', 'LOW')),
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_features (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_value TEXT,
  PRIMARY KEY (unit_id, feature_key)
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  start_at TEXT NOT NULL,
  end_at TEXT,
  block_type TEXT NOT NULL CHECK (block_type IN ('MAINTENANCE', 'OFF_MARKET')),
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at IS NULL OR start_at < end_at)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  platform TEXT,
  external_contact_id TEXT,
  messenger_psid TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  interest_score INTEGER NOT NULL DEFAULT 0 CHECK (interest_score >= 0),
  status TEXT NOT NULL CHECK (status IN ('NEW', 'QUALIFIED', 'VIEWING', 'FOLLOW_UP', 'RESERVED', 'TENANT', 'PAST_TENANT', 'CLOSED', 'HOT')),
  source TEXT,
  source_detail TEXT,
  campaign TEXT,
  ad TEXT,
  initial_unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
  current_unit_interest TEXT,
  move_in_date TEXT,
  move_in_precision TEXT,
  duration_months INTEGER CHECK (duration_months IS NULL OR duration_months > 0),
  people_count INTEGER CHECK (people_count IS NULL OR people_count > 0),
  price_known INTEGER NOT NULL DEFAULT 0 CHECK (price_known IN (0, 1)),
  terms_known INTEGER NOT NULL DEFAULT 0 CHECK (terms_known IN (0, 1)),
  owner_known INTEGER NOT NULL DEFAULT 0 CHECK (owner_known IN (0, 1)),
  viewing_requested INTEGER NOT NULL DEFAULT 0 CHECK (viewing_requested IN (0, 1)),
  viewing_datetime TEXT,
  human_takeover INTEGER NOT NULL DEFAULT 0 CHECK (human_takeover IN (0, 1)),
  lost_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
  structured_payload_json TEXT,
  occurred_at TEXT NOT NULL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  start_at TEXT NOT NULL,
  end_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('HELD', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at IS NULL OR start_at < end_at)
);

CREATE TABLE IF NOT EXISTS tenancies (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  monthly_rent_centavos INTEGER NOT NULL CHECK (monthly_rent_centavos >= 0),
  security_deposit_centavos INTEGER NOT NULL DEFAULT 0 CHECK (security_deposit_centavos >= 0),
  advance_amount_centavos INTEGER NOT NULL DEFAULT 0 CHECK (advance_amount_centavos >= 0),
  payment_due_day INTEGER NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'ACTIVE', 'ENDED', 'TERMINATED')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at IS NULL OR start_at < end_at)
);

CREATE TABLE IF NOT EXISTS viewings (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROPOSED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  confirmation_status TEXT NOT NULL CHECK (confirmation_status IN ('NOT_REQUIRED', 'UNCONFIRMED', 'CONFIRMED')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_at < end_at)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos >= 0),
  type TEXT NOT NULL CHECK (type IN ('RENT', 'SECURITY_DEPOSIT', 'ADVANCE', 'UTILITY', 'OTHER')),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'DUE', 'PAID', 'LATE', 'WAIVED')),
  paid_at TEXT,
  method TEXT CHECK (method IS NULL OR method IN ('CASH', 'GCASH', 'OTHER')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  due_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  channel TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('EAT', 'DRINK', 'NIGHT', 'DAY', 'PEOPLE', 'STREETS', 'ABOVE', 'STAY', 'TRUST')),
  place TEXT,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('IDEA', 'TO_SHOOT', 'SHOT', 'EDITED', 'SCHEDULED', 'PUBLISHED')),
  planned_date TEXT,
  publication_date TEXT,
  shoot_requirements TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_channels (
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('FACEBOOK', 'INSTAGRAM', 'REELS', 'STORIES', 'TIKTOK')),
  PRIMARY KEY (content_item_id, channel)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_unit_dates ON availability_blocks(unit_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_reservations_unit_dates ON reservations(unit_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_reservations_active ON reservations(unit_id, status, start_at);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit_dates ON tenancies(unit_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_tenancies_active ON tenancies(unit_id, status, start_at);
CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_occurred ON lead_events(lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_viewings_start ON viewings(start_at, status);
CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_status ON follow_ups(due_at, status);
CREATE INDEX IF NOT EXISTS idx_content_status_planned ON content_items(status, planned_date);
