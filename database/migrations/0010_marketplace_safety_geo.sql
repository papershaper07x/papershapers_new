ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS h3_cell TEXT;
ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS policy_version TEXT;
CREATE INDEX IF NOT EXISTS marketplace_notices_h3_idx ON marketplace_notices(h3_cell, status, expires_at);
CREATE TABLE IF NOT EXISTS marketplace_media (
 notice_id TEXT PRIMARY KEY REFERENCES marketplace_notices(id) ON DELETE CASCADE,
 image_bytes BYTEA NOT NULL CHECK (octet_length(image_bytes) <= 250000),
 mime TEXT NOT NULL CHECK (mime = 'image/webp'), width INTEGER NOT NULL, height INTEGER NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE marketplace_reviews ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE marketplace_reviews ADD COLUMN IF NOT EXISTS policy_version TEXT;
ALTER TABLE marketplace_reviews ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
INSERT INTO schema_migrations (version,applied_at) VALUES ('0010_marketplace_safety_geo',CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS marketplace_poster_blocks (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 reason TEXT NOT NULL, operator TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
