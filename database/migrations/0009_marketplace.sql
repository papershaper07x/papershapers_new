CREATE TABLE IF NOT EXISTS marketplace_notices (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, description TEXT NOT NULL, place TEXT NOT NULL, area TEXT NOT NULL,
 category TEXT NOT NULL CHECK (category IN ('Food','Offers','Events','Services','Classes','Community','Ideas')),
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn'))
);
CREATE INDEX IF NOT EXISTS marketplace_notices_public_idx ON marketplace_notices(status, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_notices_author_idx ON marketplace_notices(author_id, created_at DESC);
CREATE TABLE IF NOT EXISTS marketplace_reviews (
 id TEXT PRIMARY KEY, notice_id TEXT NOT NULL REFERENCES marketplace_notices(id) ON DELETE CASCADE,
 reviewer TEXT NOT NULL, decision TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS marketplace_reports (
 id TEXT PRIMARY KEY, notice_id TEXT NOT NULL REFERENCES marketplace_notices(id) ON DELETE CASCADE,
 reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(notice_id, reporter_id)
);
INSERT INTO schema_migrations (version, applied_at) VALUES ('0009_marketplace', CURRENT_TIMESTAMP::TEXT) ON CONFLICT (version) DO NOTHING;
