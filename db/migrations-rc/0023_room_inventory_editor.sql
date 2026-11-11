CREATE TABLE IF NOT EXISTS inventory_catalog_nodes (
  id TEXT PRIMARY KEY,
  scope_unit_id TEXT REFERENCES units(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES inventory_catalog_nodes(id) ON DELETE RESTRICT,
  level TEXT NOT NULL CHECK (level IN ('MACRO','CATEGORY','ITEM')),
  name TEXT NOT NULL,
  is_air_conditioner INTEGER NOT NULL DEFAULT 0 CHECK (is_air_conditioner IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_catalog_scope_parent ON inventory_catalog_nodes(scope_unit_id, parent_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_inventory_catalog_level ON inventory_catalog_nodes(level, active, sort_order);

CREATE TABLE IF NOT EXISTS inventory_room_item_states (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  catalog_item_id TEXT NOT NULL REFERENCES inventory_catalog_nodes(id) ON DELETE RESTRICT,
  present TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (present IN ('TRUE','FALSE','UNKNOWN')),
  quantity INTEGER CHECK (quantity IS NULL OR quantity >= 0),
  inverter TEXT CHECK (inverter IS NULL OR inverter IN ('TRUE','FALSE','UNKNOWN')),
  hp REAL CHECK (hp IS NULL OR hp > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(unit_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_room_states_unit ON inventory_room_item_states(unit_id, catalog_item_id);

INSERT OR IGNORE INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,sort_order,active,created_at,updated_at) VALUES
('inv-macro-bedroom',NULL,NULL,'MACRO','Bedroom',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-bathroom',NULL,NULL,'MACRO','Bathroom',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-kitchen',NULL,NULL,'MACRO','Kitchen',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-furniture',NULL,NULL,'MACRO','Furniture',0,40,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-electronics',NULL,NULL,'MACRO','Electronics',0,50,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-climate',NULL,NULL,'MACRO','Climate',0,60,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-laundry',NULL,NULL,'MACRO','Laundry',0,70,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-housekeeping',NULL,NULL,'MACRO','Housekeeping/Cleaning',0,80,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-lighting',NULL,NULL,'MACRO','Lighting',0,90,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-window',NULL,NULL,'MACRO','Window Treatments',0,100,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-safety',NULL,NULL,'MACRO','Safety & Security',0,110,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-decoration',NULL,NULL,'MACRO','Decoration',0,120,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-work',NULL,NULL,'MACRO','Work Equipment',0,130,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-macro-balcony',NULL,NULL,'MACRO','Balcony / Outdoor',0,140,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z');

INSERT OR IGNORE INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,sort_order,active,created_at,updated_at) VALUES
('inv-cat-bed',NULL,'inv-macro-bedroom','CATEGORY','Bed & Mattress',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-bedding',NULL,'inv-macro-bedroom','CATEGORY','Bedding',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-decorative-bedding',NULL,'inv-macro-bedroom','CATEGORY','Decorative Bedding',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-fixtures',NULL,'inv-macro-bathroom','CATEGORY','Fixtures',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-towels',NULL,'inv-macro-bathroom','CATEGORY','Towels/Linen',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-amenities',NULL,'inv-macro-bathroom','CATEGORY','Amenities/Dispensers',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-appliances',NULL,'inv-macro-kitchen','CATEGORY','Appliances',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-cookware',NULL,'inv-macro-kitchen','CATEGORY','Cookware',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-tableware',NULL,'inv-macro-kitchen','CATEGORY','Tableware',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-cutlery',NULL,'inv-macro-kitchen','CATEGORY','Cutlery',0,40,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-tools',NULL,'inv-macro-kitchen','CATEGORY','Kitchen Tools',0,50,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-seating',NULL,'inv-macro-furniture','CATEGORY','Seating',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-tables',NULL,'inv-macro-furniture','CATEGORY','Tables/Work',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-storage',NULL,'inv-macro-furniture','CATEGORY','Storage',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-tv',NULL,'inv-macro-electronics','CATEGORY','TV/Entertainment',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-power',NULL,'inv-macro-electronics','CATEGORY','Charging/Power',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-ac',NULL,'inv-macro-climate','CATEGORY','Air Conditioning',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-cat-fans',NULL,'inv-macro-climate','CATEGORY','Fans',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-iron',NULL,'inv-macro-laundry','CATEGORY','Iron & Ironing',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-cat-cleaning',NULL,'inv-macro-housekeeping','CATEGORY','Cleaning Supplies',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z');

INSERT OR IGNORE INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,sort_order,active,created_at,updated_at) VALUES
('inv-item-bed',NULL,'inv-cat-bed','ITEM','Bed',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-mattress',NULL,'inv-cat-bed','ITEM','Mattress',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-pillow',NULL,'inv-cat-bedding','ITEM','Pillow',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-sheets',NULL,'inv-cat-bedding','ITEM','Bed Sheet Set',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-duvet',NULL,'inv-cat-bedding','ITEM','Duvet',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-blanket',NULL,'inv-cat-decorative-bedding','ITEM','Decorative Blanket',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-toilet',NULL,'inv-cat-fixtures','ITEM','Toilet',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-shower',NULL,'inv-cat-fixtures','ITEM','Shower',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-bath-towel',NULL,'inv-cat-towels','ITEM','Bath Towel',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-hand-towel',NULL,'inv-cat-towels','ITEM','Hand Towel',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-soap',NULL,'inv-cat-amenities','ITEM','Soap Dispenser',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-microwave',NULL,'inv-cat-appliances','ITEM','Microwave',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-fridge',NULL,'inv-cat-appliances','ITEM','Refrigerator',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-kettle',NULL,'inv-cat-appliances','ITEM','Kettle',0,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-pot',NULL,'inv-cat-cookware','ITEM','Cooking Pot',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-pan',NULL,'inv-cat-cookware','ITEM','Frying Pan',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-flat-plate',NULL,'inv-cat-tableware','ITEM','Flat Plate',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-bowl',NULL,'inv-cat-tableware','ITEM','Bowl',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-fork',NULL,'inv-cat-cutlery','ITEM','Fork',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-spoon',NULL,'inv-cat-cutlery','ITEM','Spoon',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-can-opener',NULL,'inv-cat-tools','ITEM','Can Opener',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-chair',NULL,'inv-cat-seating','ITEM','Chair',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-desk',NULL,'inv-cat-tables','ITEM','Desk/Table',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-wardrobe',NULL,'inv-cat-storage','ITEM','Wardrobe',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-tv',NULL,'inv-cat-tv','ITEM','Television',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-extension',NULL,'inv-cat-power','ITEM','Extension / Power Strip',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-ac',NULL,'inv-cat-ac','ITEM','Air Conditioner',1,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-fan',NULL,'inv-cat-fans','ITEM','Fan',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-iron',NULL,'inv-cat-iron','ITEM','Iron',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-board',NULL,'inv-cat-iron','ITEM','Ironing Board',0,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),('inv-item-broom',NULL,'inv-cat-cleaning','ITEM','Broom',0,10,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z');
