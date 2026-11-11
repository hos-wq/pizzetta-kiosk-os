# Pizzetta database foundation

The ordering app now has a dedicated Cloudflare D1 schema, separate from the copied Boutique Rooms database.

## Model

- `branches` and `branch_menu_items`: branch operations, availability and preparation time.
- `menu_categories`, `menu_items`, `menu_item_variants`: canonical menu and PHP prices in centavos.
- `customers`, `loyalty_accounts`, `loyalty_ledger`: remembered guests and points history.
- `orders`, `order_items`, `order_events`: immutable order snapshots and kitchen status history.
- `prep_windows`: scheduled pickup/dine-in capacity and preparation windows.

The menu seed is based on the current EVENTS MENU reference. Ingredient and allergen data is intentionally stored as a snapshot on the menu item and copied into each order item, so historical orders remain auditable if the recipe changes.

## Local database commands

From `D:\PIZZETTA`:

```powershell
npx wrangler d1 migrations apply pizzetta-ordering-os --local --config wrangler.pizzetta.toml
npx wrangler d1 execute pizzetta-ordering-os --local --config wrangler.pizzetta.toml --command "SELECT name, price_centavos FROM menu_items JOIN menu_item_variants ON menu_items.id = menu_item_variants.menu_item_id ORDER BY menu_items.sort_order"
```

The next implementation step is the worker repository/API: read the canonical menu from D1 and create orders transactionally, then replace the frontend mock array with those endpoints.
