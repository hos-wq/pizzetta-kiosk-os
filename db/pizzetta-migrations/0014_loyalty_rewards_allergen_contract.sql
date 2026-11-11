-- PIZZETTA loyalty contract: one completed order = one stamp;
-- every third stamp unlocks one reward for a signed-in customer.
ALTER TABLE loyalty_accounts ADD COLUMN rewards_available INTEGER NOT NULL DEFAULT 0 CHECK (rewards_available >= 0);

DROP TRIGGER IF EXISTS trg_loyalty_award_on_completion;
DROP TRIGGER IF EXISTS trg_loyalty_reward_on_third_stamp;

CREATE TRIGGER trg_loyalty_award_on_completion
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'COMPLETED'
  AND OLD.status <> 'COMPLETED'
  AND NEW.customer_id IS NOT NULL
  AND NEW.loyalty_points_awarded = 0
BEGIN
  INSERT INTO loyalty_ledger (id, loyalty_account_id, order_id, points_delta, reason)
  SELECT lower(hex(randomblob(16))), la.id, NEW.id, 1, 'ORDER_COMPLETED'
  FROM loyalty_accounts la
  WHERE la.customer_id = NEW.customer_id;
  UPDATE loyalty_accounts
  SET points_balance = points_balance + 1,
      lifetime_points = lifetime_points + 1,
      rewards_available = rewards_available + CASE WHEN (lifetime_points + 1) % 3 = 0 THEN 1 ELSE 0 END,
      updated_at = CURRENT_TIMESTAMP
  WHERE customer_id = NEW.customer_id;
  UPDATE orders SET loyalty_points_awarded = 1 WHERE id = NEW.id;
END;

-- Public allergen vocabulary is intentionally limited to four labels.
UPDATE menu_items
SET allergens_json = CASE id
  WHEN 'margherita' THEN '["Dairy","Wheat"]'
  WHEN 'pepperoni' THEN '["Dairy","Wheat"]'
  WHEN 'hawaiian' THEN '["Dairy","Wheat"]'
  WHEN 'spinach-dip' THEN '["Dairy","Wheat"]'
  WHEN 'five-cheese' THEN '["Dairy","Wheat"]'
  WHEN 'vegetarian' THEN '["Dairy","Wheat"]'
  WHEN 'meat-overload' THEN '["Dairy","Wheat"]'
  WHEN 'chicken-masala' THEN '["Dairy","Wheat"]'
  WHEN 'chorizo' THEN '["Dairy","Wheat"]'
  WHEN 'samurai' THEN '["Dairy","Wheat"]'
  WHEN 'chicken-suya' THEN '["Dairy","Wheat"]'
  WHEN 'pizza-corn' THEN '["Dairy","Wheat"]'
  WHEN 'pizzalada' THEN '["Dairy","Wheat"]'
  WHEN 'lasagna-1' THEN '["Dairy","Wheat"]'
  WHEN 'pasta-alfredo' THEN '["Dairy","Wheat"]'
  WHEN 'pasta-pizzetta' THEN '["Dairy","Wheat"]'
  WHEN 'pasta-pesto' THEN '["Dairy","Wheat","Nuts"]'
  WHEN 'thin-crust-cheese-sticks' THEN '["Dairy","Wheat"]'
  WHEN 'thin-crust-choco-glaze' THEN '["Dairy","Wheat","Nuts"]'
  ELSE '[]'
END
WHERE is_active = 1;
