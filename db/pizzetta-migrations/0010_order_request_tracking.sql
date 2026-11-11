ALTER TABLE order_requests ADD COLUMN request_access_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_requests_access_token_hash ON order_requests(request_access_token_hash) WHERE request_access_token_hash IS NOT NULL;
