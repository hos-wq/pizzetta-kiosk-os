PRAGMA foreign_keys = ON;

ALTER TABLE staff_users ADD COLUMN username TEXT;
ALTER TABLE staff_users ADD COLUMN password_salt TEXT;
ALTER TABLE staff_users ADD COLUMN password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_username ON staff_users(username) WHERE username IS NOT NULL;
