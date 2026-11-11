PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO menu_categories (id, slug, name, sort_order, accent_token)
VALUES ('cat-thin-crust', 'thin-crust', 'Thin Crust 10″', 30, 'orange');

UPDATE menu_categories SET sort_order = 10, name = 'Classics' WHERE id = 'cat-classic';
UPDATE menu_categories SET sort_order = 20, name = 'Signature' WHERE id = 'cat-signature';
UPDATE menu_categories SET sort_order = 40 WHERE id = 'cat-salads';
UPDATE menu_categories SET sort_order = 50 WHERE id = 'cat-spaghetti';
UPDATE menu_categories SET sort_order = 60 WHERE id = 'cat-lasagna';
UPDATE menu_categories SET sort_order = 70 WHERE id = 'cat-iced-tea';
UPDATE menu_categories SET sort_order = 80 WHERE id = 'cat-meals';

UPDATE menu_items SET category_id = 'cat-thin-crust', sort_order = 10 WHERE id = 'thin-crust-cheese-sticks';
UPDATE menu_items SET category_id = 'cat-thin-crust', sort_order = 20 WHERE id = 'thin-crust-choco-glaze';

UPDATE menu_items SET sort_order = 10 WHERE id = 'margherita';
UPDATE menu_items SET sort_order = 20 WHERE id = 'spinach-dip';
UPDATE menu_items SET sort_order = 30 WHERE id = 'five-cheese';
UPDATE menu_items SET sort_order = 40 WHERE id = 'vegetarian';
UPDATE menu_items SET sort_order = 50 WHERE id = 'pepperoni';
UPDATE menu_items SET sort_order = 60 WHERE id = 'hawaiian';
UPDATE menu_items SET sort_order = 70 WHERE id = 'meat-overload';

UPDATE menu_items SET sort_order = 10 WHERE id = 'pizza-corn';
UPDATE menu_items SET sort_order = 20 WHERE id = 'pizzalada';
UPDATE menu_items SET sort_order = 30 WHERE id = 'chorizo';
UPDATE menu_items SET sort_order = 40 WHERE id = 'chicken-masala';
UPDATE menu_items SET sort_order = 50 WHERE id = 'samurai';
UPDATE menu_items SET sort_order = 60 WHERE id = 'chicken-suya';
