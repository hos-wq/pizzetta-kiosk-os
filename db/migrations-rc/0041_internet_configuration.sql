CREATE TABLE IF NOT EXISTS building_internet_plans (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  service_brand TEXT,
  underlying_isp TEXT,
  technology TEXT,
  advertised_speed_mbps INTEGER CHECK (advertised_speed_mbps IS NULL OR advertised_speed_mbps > 0),
  monthly_fee_centavos INTEGER NOT NULL CHECK (monthly_fee_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  activation_policy TEXT,
  payment_responsibility TEXT NOT NULL CHECK (payment_responsibility IN ('TENANT','OWNER','BUILDING_ADMINISTRATION','UNKNOWN')),
  payment_recipient TEXT,
  billing TEXT,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(building_id, effective_from),
  CHECK (effective_until IS NULL OR effective_from < effective_until)
);

CREATE INDEX IF NOT EXISTS idx_building_internet_plans_lookup ON building_internet_plans(building_id, effective_from, effective_until);

CREATE TABLE IF NOT EXISTS room_internet_equipment (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  service_brand TEXT,
  technology TEXT,
  serial_number TEXT,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(unit_id, equipment_type)
);

CREATE INDEX IF NOT EXISTS idx_room_internet_equipment_unit ON room_internet_equipment(unit_id);

CREATE TABLE IF NOT EXISTS tenancy_internet_subscriptions (
  id TEXT PRIMARY KEY,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  building_internet_plan_id TEXT NOT NULL REFERENCES building_internet_plans(id) ON DELETE RESTRICT,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('NOT_SUBSCRIBED','NOT_CONFIRMED','ACTIVE','ENDED')),
  activation_status TEXT NOT NULL CHECK (activation_status IN ('NOT_APPLICABLE','NOT_CONFIRMED','ACTIVE','ENDED')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('NOT_APPLICABLE','NOT_CONFIRMED','PAID','UNPAID')),
  monthly_fee_centavos INTEGER NOT NULL CHECK (monthly_fee_centavos >= 0),
  currency_code TEXT NOT NULL DEFAULT 'PHP' CHECK (currency_code = 'PHP'),
  selected_at TEXT,
  activated_at TEXT,
  ended_at TEXT,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenancy_id, building_internet_plan_id),
  CHECK (activated_at IS NULL OR selected_at IS NULL OR selected_at <= activated_at),
  CHECK (ended_at IS NULL OR activated_at IS NULL OR activated_at < ended_at)
);

CREATE INDEX IF NOT EXISTS idx_tenancy_internet_subscriptions_tenancy ON tenancy_internet_subscriptions(tenancy_id, subscription_status);
