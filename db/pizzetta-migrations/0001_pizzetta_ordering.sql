-- PIZZETTA Ordering OS / D1 schema
-- Prices are stored as integer centavos (PHP 259.00 => 25900).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  accent_token TEXT NOT NULL DEFAULT 'orange',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pizza','salad','pasta','lasagna','tea','meal')),
  badge TEXT,
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  allergens_json TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_item_variants (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_centavos INTEGER NOT NULL CHECK (price_centavos >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  UNIQUE(menu_item_id, label)
);

CREATE TABLE IF NOT EXISTS branch_menu_items (
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0,1)),
  sold_out_until TEXT,
  prep_minutes INTEGER NOT NULL DEFAULT 18 CHECK (prep_minutes >= 0),
  PRIMARY KEY (branch_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  display_name TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (marketing_opt_in IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_order_at TEXT
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  tier TEXT NOT NULL DEFAULT 'starter',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id TEXT PRIMARY KEY,
  loyalty_account_id TEXT NOT NULL REFERENCES loyalty_accounts(id),
  order_id TEXT,
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  customer_id TEXT REFERENCES customers(id),
  service_mode TEXT NOT NULL CHECK (service_mode IN ('DINE_IN','PICKUP')),
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED')),
  scheduled_for TEXT,
  table_label TEXT,
  subtotal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_centavos >= 0),
  discount_centavos INTEGER NOT NULL DEFAULT 0 CHECK (discount_centavos >= 0),
  total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  loyalty_points_awarded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  variant_label TEXT,
  item_name_snapshot TEXT NOT NULL,
  ingredients_snapshot_json TEXT NOT NULL DEFAULT '[]',
  allergens_snapshot_json TEXT NOT NULL DEFAULT '[]',
  unit_price_centavos INTEGER NOT NULL CHECK (unit_price_centavos >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_centavos INTEGER NOT NULL CHECK (line_total_centavos >= 0),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prep_windows (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_mode TEXT NOT NULL CHECK (service_mode IN ('DINE_IN','PICKUP')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  UNIQUE(branch_id, service_mode, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_branch_menu_available ON branch_menu_items(branch_id, is_available);
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders(branch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
