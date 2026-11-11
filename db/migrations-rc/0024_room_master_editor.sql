CREATE TABLE IF NOT EXISTS room_master_data (
  unit_id TEXT PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
  display_name TEXT,
  building TEXT,
  address TEXT,
  orientation TEXT,
  view_classification TEXT,
  view_description TEXT,
  acoustic_characteristics TEXT,
  sleeping_configuration TEXT,
  standard_max_occupancy INTEGER,
  furnished TEXT CHECK (furnished IS NULL OR furnished IN ('TRUE','FALSE','UNKNOWN')),
  standard_minimum_months INTEGER,
  advance_months INTEGER,
  security_deposit_months INTEGER,
  reservation_rules TEXT,
  association_dues_treatment TEXT,
  internet_price_centavos INTEGER,
  terms_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE inventory_catalog_nodes ADD COLUMN attribute_schema TEXT;
ALTER TABLE inventory_room_item_states ADD COLUMN item_type TEXT;
ALTER TABLE inventory_room_item_states ADD COLUMN screen_inches INTEGER;
ALTER TABLE inventory_room_item_states ADD COLUMN bed_size TEXT;

UPDATE inventory_catalog_nodes SET name='Refrigerator / Freezer' WHERE id='inv-item-fridge';
UPDATE inventory_catalog_nodes SET name='Electric Water Kettle' WHERE id='inv-item-kettle';
UPDATE inventory_catalog_nodes SET attribute_schema='{"type":"WINDOW|SPLIT","inverter":"TRUE|FALSE|UNKNOWN","hp":"number"}' WHERE id='inv-item-ac';
UPDATE inventory_catalog_nodes SET attribute_schema='{"screen_inches":"number"}' WHERE id='inv-item-tv';
UPDATE inventory_catalog_nodes SET attribute_schema='{"size":"SINGLE|DOUBLE|QUEEN|KING"}' WHERE id='inv-item-bed';

INSERT OR IGNORE INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,attribute_schema,sort_order,active,created_at,updated_at) VALUES
('inv-item-mattress-protector',NULL,'inv-cat-bed','ITEM','Mattress Protector / Cover',0,NULL,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-pillowcase',NULL,'inv-cat-bedding','ITEM','Pillow Case',0,NULL,15,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-comforter',NULL,'inv-cat-decorative-bedding','ITEM','Comforter',0,NULL,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-hot-shower',NULL,'inv-cat-fixtures','ITEM','Hot-water Shower',0,NULL,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-bidet',NULL,'inv-cat-fixtures','ITEM','Bidet',0,NULL,40,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-face-towel',NULL,'inv-cat-towels','ITEM','Face Towel',0,NULL,30,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-hairdryer',NULL,'inv-cat-amenities','ITEM','Hair Dryer',0,NULL,20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-induction',NULL,'inv-cat-appliances','ITEM','Induction Cooker',0,NULL,40,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-ricecooker',NULL,'inv-cat-appliances','ITEM','Rice Cooker',0,NULL,50,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z'),
('inv-item-smart-tv',NULL,'inv-cat-tv','ITEM','Smart TV',0,'{"screen_inches":"number"}',20,1,'2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z');
