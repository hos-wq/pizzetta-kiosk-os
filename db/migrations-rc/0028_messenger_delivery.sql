-- Delivery metadata only: never message bodies, transcripts or access tokens.
CREATE TABLE messenger_deliveries (
  page_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('PROCESSING','SENT','SUPPRESSED','FAILED','UNCERTAIN')),
  failure_code TEXT,
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(page_id,message_id)
);
CREATE INDEX idx_messenger_deliveries_status ON messenger_deliveries(status,updated_at);
