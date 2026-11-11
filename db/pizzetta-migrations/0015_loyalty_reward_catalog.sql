CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id TEXT PRIMARY KEY,
  loyalty_account_id TEXT NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL CHECK (milestone IN (3,6,9,12)),
  reward_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','REDEEMED','EXPIRED')),
  source_order_id TEXT REFERENCES orders(id),
  redeemed_order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_rewards_account_milestone
  ON loyalty_rewards(loyalty_account_id, milestone);

DROP TRIGGER IF EXISTS trg_loyalty_award_on_completion;
CREATE TRIGGER trg_loyalty_award_on_completion
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'COMPLETED'
  AND OLD.status <> 'COMPLETED'
  AND NEW.customer_id IS NOT NULL
  AND NEW.loyalty_points_awarded = 0
  AND NEW.subtotal_centavos >= 29900
BEGIN
  INSERT INTO loyalty_ledger (id, loyalty_account_id, order_id, points_delta, reason)
  SELECT lower(hex(randomblob(16))), la.id, NEW.id, 1, 'ORDER_COMPLETED_MIN_299'
  FROM loyalty_accounts la
  WHERE la.customer_id = NEW.customer_id;
  UPDATE loyalty_accounts
  SET points_balance = points_balance + 1,
      lifetime_points = lifetime_points + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE customer_id = NEW.customer_id;
  INSERT OR IGNORE INTO loyalty_rewards (id, loyalty_account_id, milestone, reward_code, source_order_id)
  SELECT lower(hex(randomblob(16))), la.id, la.lifetime_points,
    CASE la.lifetime_points
      WHEN 3 THEN 'DISCOUNT_15'
      WHEN 6 THEN 'DISCOUNT_30'
      WHEN 9 THEN 'FREE_CLASSIC_8'
      WHEN 12 THEN 'FREE_CLASSIC_14'
    END,
    NEW.id
  FROM loyalty_accounts la
  WHERE la.customer_id = NEW.customer_id
    AND la.lifetime_points IN (3,6,9,12);
  UPDATE loyalty_accounts
  SET rewards_available = (SELECT COUNT(*) FROM loyalty_rewards lr WHERE lr.loyalty_account_id = loyalty_accounts.id AND lr.status = 'AVAILABLE'),
      updated_at = CURRENT_TIMESTAMP
  WHERE customer_id = NEW.customer_id;
  UPDATE orders SET loyalty_points_awarded = 1 WHERE id = NEW.id;
END;
