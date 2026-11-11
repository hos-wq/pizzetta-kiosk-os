PRAGMA foreign_keys = ON;

ALTER TABLE branches ADD COLUMN contact_number TEXT;

UPDATE branches SET
  code='POBLA',
  name='Pizzetta Pobla',
  address='5687 Dona Carmen, Brgy. Poblacion, Makati City, 1210 Metro Manila',
  latitude=14.5657,
  longitude=121.0286,
  contact_number='0962 055 8786',
  updated_at=CURRENT_TIMESTAMP
WHERE id='branch-poblacion';

INSERT OR IGNORE INTO branches (id, code, name, address, latitude, longitude, timezone, contact_number)
VALUES
  ('branch-antipolo','ANT','Pizzetta Antipolo','Lot 4E, ASM Building, Sitio Halang, Antipolo, 1870 Rizal',14.5846,121.1765,'Asia/Manila','0917 310 0705'),
  ('branch-bf-homes','BFH','Pizzetta BF Homes','BF Homes, South Food Hub, Caltex, Elizalde corner President''s Ave, Parañaque, 1720 Metro Manila',14.4635,121.0268,'Asia/Manila','0956 075 1463');

INSERT OR IGNORE INTO branch_operations (branch_id) SELECT id FROM branches WHERE id IN ('branch-poblacion','branch-antipolo','branch-bf-homes');
INSERT OR IGNORE INTO branch_menu_items (branch_id, menu_item_id, prep_minutes) SELECT b.id, m.id, CASE m.kind WHEN 'pizza' THEN 18 WHEN 'tea' THEN 5 WHEN 'meal' THEN 30 ELSE 25 END FROM branches b CROSS JOIN menu_items m WHERE b.id IN ('branch-antipolo','branch-bf-homes');
