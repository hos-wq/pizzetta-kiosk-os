INSERT OR IGNORE INTO branches (id, code, name, address, latitude, longitude) VALUES
  ('branch-poblacion', 'POB', 'Pizzetta Poblacion', 'Poblacion, Makati City', 14.5657, 121.0286);

INSERT OR IGNORE INTO menu_categories (id, slug, name, sort_order, accent_token) VALUES
  ('cat-classic','classic','Classic Pizza',10,'orange'),
  ('cat-signature','signature','Signature Pizza',20,'orange'),
  ('cat-salads','salads','Salads',30,'salad-green'),
  ('cat-spaghetti','spaghetti','Spaghetti',40,'yellow'),
  ('cat-lasagna','lasagna','Lasagna',50,'ragu-red'),
  ('cat-iced-tea','iced-tea','Iced Tea',60,'tropical-tea'),
  ('cat-meals','meals','Meals',70,'yellow');

INSERT OR IGNORE INTO menu_items (id, category_id, sku, name, subtitle, description, kind, badge, ingredients_json, allergens_json, sort_order) VALUES
  ('margherita','cat-classic','PIZ-001','Margherita','MINIMAL, HONEST','Minimal, honest','pizza','Guest favourite','["Tomato","Fresh basil","Mozzarella","Olive oil"]','["Milk"]',10),
  ('pepperoni','cat-classic','PIZ-002','Pepperoni','THE CLASSIC N.Y. TOPPING','The classic N.Y. topping','pizza',NULL,'["Pepperoni","Mozzarella","Oregano"]','["Milk","Wheat"]',20),
  ('hawaiian','cat-classic','PIZ-003','Hawaiian','CHILL, SWEET–SALTY','Chill, sweet–salty','pizza',NULL,'["Ham","Sweet pineapple","Mozzarella","Oregano"]','["Milk"]',30),
  ('spinach-dip','cat-classic','PIZ-004','Spinach Dip','PARTY DIP ON PIZZA','Party dip on pizza','pizza',NULL,'["Spinach dip base","Garlic butter","Mozzarella","Cracked pepper"]','["Milk","Wheat"]',40),
  ('five-cheese','cat-classic','PIZ-005','5 Cheese + Garlic','CHEESY COMFORT','Cheesy comfort','pizza',NULL,'["Gouda","Emmental","Parmesan","Cream cheese","Mozzarella","Garlic butter"]','["Milk","Wheat"]',50),
  ('vegetarian','cat-classic','PIZ-006','Vegetarian','THE HEALTHY CHOICE','The healthy choice','pizza',NULL,'["Bell pepper","Mushrooms","Olives","Onion","Basil"]','["Milk","Wheat"]',60),
  ('meat-overload','cat-classic','PIZ-007','Meat Overload','FOR CARNIVORE MODE','For carnivore mode','pizza',NULL,'["Pepperoni","Italian sausage","Ham","Melt-in mozzarella"]','["Milk","Wheat"]',70),
  ('chicken-masala','cat-signature','PIZ-101','Chicken Masala','AROMATIC SPICY FLAVOR','Aromatic spicy flavor','pizza',NULL,'["Spiced chicken","Garam masala sauce","Yogurt–garlic finish"]','["Milk"]',10),
  ('chorizo','cat-signature','PIZ-102','Chorizo','A SPANISH VIBE','A Spanish vibe','pizza',NULL,'["Smoky chorizo bites","Pimiento","Onion","Mozzarella","Tomato sauce"]','["Milk","Wheat"]',20),
  ('samurai','cat-signature','PIZ-103','Samurai','CRUNCHY, UMAMI-FLAVOR','Crunchy, umami-flavor','pizza',NULL,'["Surimi","Bonito flakes","Mayo","Teriyaki","Mozzarella"]','["Fish","Egg","Milk","Soy"]',30),
  ('chicken-suya','cat-signature','PIZ-104','Chicken Suya','SPICY NA PIZZA','Spicy na pizza','pizza',NULL,'["Spicy-suya glazed chicken","Bell pepper","Red onion","Green chilli","Mozzarella"]','["Milk","Peanut"]',40),
  ('pizza-corn','cat-signature','PIZ-105','Pizza Corn','STREET-FLAVOR NA PIZZA','Street-flavor na pizza','pizza',NULL,'["Garlic butter","Sweet corn","Mozzarella","Japanese mayo"]','["Milk","Egg"]',50),
  ('pizzalada','cat-signature','PIZ-106','Pizzalada','HOMMIE VIBES','Hommie vibes','pizza',NULL,'["Crushed tomato sauce","Mozzarella","Smoked eggplant","Red onion","Fresh tomatoes","Salted eggs","Japanese mayo"]','["Milk","Egg"]',60),
  ('lasagna-1','cat-lasagna','TRAY-001','Lasagna','THE ITALIAN HOLIDAYS CLASSIC DISH','The Italian holidays classic dish','lasagna','Good for 10–12 pax','["Pork meat sauce","Béchamel","Egg pasta","Mozzarella","Parmesan"]','["Milk","Egg","Wheat"]',10),
  ('pasta-alfredo','cat-spaghetti','TRAY-002','Alfredo with Ham & Mushroom','A REVISITED ITALIAN’S CLASSIC','A revisited Italian’s classic','pasta','Good for 10–12 pax','["Spaghetti noodles","Cheese sauce","Ham","Mushroom","Parmesan"]','["Milk","Wheat"]',10),
  ('salad-kani','cat-salads','TRAY-003','Kani Salad','A JAPANESE CLASSIC','A Japanese classic','salad','Good for 10–12 pax','["Romaine lettuce","Tomatoes","Onion","Kani","Sesame dressing"]','["Crustaceans","Egg","Sesame"]',10),
  ('pasta-pizzetta','cat-spaghetti','TRAY-004','Spaghetti à la Pizzetta','MEATY & CREAMY','Meaty & creamy','pasta','Good for 10–12 pax','["Spaghetti noodles","Pork meat sauce","Mushroom","Parmesan"]','["Milk","Wheat"]',20),
  ('salad-caesar','cat-salads','TRAY-005','Caesar Salad','A CLASSIC','A classic','salad','Good for 10–12 pax','["Romaine lettuce","Grilled chicken","Bacon","Caesar dressing"]','["Milk","Egg","Fish"]',20),
  ('pasta-pesto','cat-spaghetti','TRAY-006','Pesto Creamy Basil and Chicken','OUR BEST SELLER','Our best seller','pasta','Good for 10–12 pax','["Spaghetti noodles","Creamy pesto sauce","Grilled chicken"]','["Milk","Wheat","Nuts"]',30),
  ('tea-glass','cat-iced-tea','TEA-001','Tropical Iced Tea','BREWED FOR THE TABLE','Brewed tea · passionfruit · citrus · glass','tea','Add to any order','["Brewed tea","Tropical fruit","Citrus"]','[]',10),
  ('tea-pitcher','cat-iced-tea','TEA-002','Tropical Iced Tea Pitcher','GOOD FOR SHARING','Brewed tea · passionfruit · citrus · pitcher','tea','Good for sharing','["Brewed tea","Tropical fruit","Citrus"]','[]',20),
  ('crust-meal','cat-meals','MEAL-001','Crust Meal','BEST EVERYDAY VALUE','Pizza The Eight or spaghetti or lasagna + salad + iced tea','meal','Best everyday value','["One main choice","One salad","Iced tea"]','["Depends on selections"]',10),
  ('barkada-meal','cat-meals','MEAL-002','Barkada Meal','GOOD FOR 10–12','14″ pizza + 2 salads + 3 spaghetti + lasagna + iced tea pitcher','meal','Good for 10–12','["14″ pizza","2 salads","3 spaghetti trays","Lasagna tray","Iced tea pitcher"]','["Depends on selections"]',20);

INSERT OR IGNORE INTO menu_item_variants (id, menu_item_id, label, price_centavos, is_default) VALUES
  ('v-margherita','margherita','14″',25900,1),('v-pepperoni','pepperoni','14″',33900,1),('v-hawaiian','hawaiian','14″',31900,1),('v-spinach','spinach-dip','14″',26900,1),('v-five-cheese','five-cheese','14″',28900,1),('v-vegetarian','vegetarian','14″',31900,1),('v-meat','meat-overload','14″',35900,1),
  ('v-masala','chicken-masala','14″',29900,1),('v-chorizo','chorizo','14″',29900,1),('v-samurai','samurai','14″',34900,1),('v-suya','chicken-suya','14″',33900,1),('v-corn','pizza-corn','14″',35900,1),('v-pizzalada','pizzalada','14″',35900,1),
  ('v-lasagna','lasagna-1','Tray · 10/12 pax',129900,1),('v-alfredo','pasta-alfredo','Tray · 10/12 pax',99900,1),('v-kani','salad-kani','Tray · 10/12 pax',129900,1),('v-pizzetta','pasta-pizzetta','Tray · 10/12 pax',99900,1),('v-caesar','salad-caesar','Tray · 10/12 pax',129900,1),('v-pesto','pasta-pesto','Tray · 10/12 pax',99900,1),
  ('v-tea-glass','tea-glass','Glass',12000,1),('v-tea-pitcher','tea-pitcher','Pitcher',39900,1),('v-crust','crust-meal','Meal',69900,1),('v-barkada','barkada-meal','Meal',399900,1);

INSERT OR IGNORE INTO branch_menu_items (branch_id, menu_item_id, prep_minutes) SELECT 'branch-poblacion', id, CASE kind WHEN 'pizza' THEN 18 WHEN 'tea' THEN 5 WHEN 'meal' THEN 30 ELSE 25 END FROM menu_items;
