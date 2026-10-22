ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS reservations_enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS marketplace_engagement (
 notice_id TEXT NOT NULL REFERENCES marketplace_notices(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 interested BOOLEAN NOT NULL DEFAULT FALSE,
 viewed BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(notice_id,user_id)
);
CREATE TABLE IF NOT EXISTS marketplace_reservations (
 notice_id TEXT NOT NULL REFERENCES marketplace_notices(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('requested','confirmed','declined','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(notice_id,user_id)
);
CREATE INDEX IF NOT EXISTS marketplace_reservations_user_idx ON marketplace_reservations(user_id,updated_at DESC);
INSERT INTO schema_migrations(version,applied_at) VALUES('0012_marketplace_engagement',CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;
