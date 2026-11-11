CREATE TRIGGER IF NOT EXISTS trg_loyalty_award_on_completion
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' AND NEW.customer_id IS NOT NULL AND NEW.loyalty_points_awarded = 0
BEGIN
  INSERT INTO loyalty_ledger (id, loyalty_account_id, order_id, points_delta, reason)
  SELECT lower(hex(randomblob(16))), la.id, NEW.id, 1, 'ORDER_COMPLETED'
  FROM loyalty_accounts la
  WHERE la.customer_id = NEW.customer_id;
  UPDATE loyalty_accounts
  SET points_balance = points_balance + 1,
      lifetime_points = lifetime_points + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE customer_id = NEW.customer_id;
  UPDATE orders SET loyalty_points_awarded = 1 WHERE id = NEW.id;
END;
