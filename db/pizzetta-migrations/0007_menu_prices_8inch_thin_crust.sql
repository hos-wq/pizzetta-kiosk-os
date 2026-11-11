PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO menu_item_variants (id, menu_item_id, label, price_centavos, sort_order, is_default)
VALUES
  ('v-margherita-8', 'margherita', '8″', 9900, 5, 0),
  ('v-pepperoni-8', 'pepperoni', '8″', 13900, 5, 0),
  ('v-hawaiian-8', 'hawaiian', '8″', 12900, 5, 0),
  ('v-spinach-8', 'spinach-dip', '8″', 9900, 5, 0),
  ('v-five-cheese-8', 'five-cheese', '8″', 9900, 5, 0),
  ('v-vegetarian-8', 'vegetarian', '8″', 9900, 5, 0),
  ('v-meat-8', 'meat-overload', '8″', 14900, 5, 0),
  ('v-masala-8', 'chicken-masala', '8″', 12900, 5, 0),
  ('v-chorizo-8', 'chorizo', '8″', 12900, 5, 0),
  ('v-samurai-8', 'samurai', '8″', 14900, 5, 0),
  ('v-suya-8', 'chicken-suya', '8″', 14900, 5, 0),
  ('v-corn-8', 'pizza-corn', '8″', 13900, 5, 0),
  ('v-pizzalada-8', 'pizzalada', '8″', 13900, 5, 0);

INSERT OR IGNORE INTO menu_items
  (id, category_id, sku, name, subtitle, description, kind, badge, ingredients_json, allergens_json, sort_order, is_active)
VALUES
  ('thin-crust-cheese-sticks', 'cat-classic', 'THIN-001', 'Cheese Sticks', '10″ THIN CRUST', 'Thin crust pizza. Composition pending menu specification.', 'pizza', '10″ Thin Crust', '[]', '[]', 80, 0),
  ('thin-crust-choco-glaze', 'cat-classic', 'THIN-002', 'Choco Glaze', '10″ THIN CRUST', 'Thin crust pizza. Composition pending menu specification.', 'pizza', '10″ Thin Crust', '[]', '[]', 90, 0);

INSERT OR IGNORE INTO menu_item_variants (id, menu_item_id, label, price_centavos, sort_order, is_default)
VALUES
  ('v-thin-cheese-sticks-10', 'thin-crust-cheese-sticks', '10″ Thin Crust', 9900, 1, 1),
  ('v-thin-choco-glaze-10', 'thin-crust-choco-glaze', '10″ Thin Crust', 9900, 1, 1);
