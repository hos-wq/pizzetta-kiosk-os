CREATE TRIGGER IF NOT EXISTS trg_order_request_retention
AFTER INSERT ON order_requests
BEGIN
  UPDATE order_requests
  SET expires_at = CASE
    WHEN NEW.scheduled_for IS NOT NULL AND datetime(NEW.scheduled_for, '+1 day') > datetime('now', '+7 days')
      THEN datetime(NEW.scheduled_for, '+1 day')
    ELSE datetime('now', '+7 days')
  END
  WHERE id = NEW.id;
END;
