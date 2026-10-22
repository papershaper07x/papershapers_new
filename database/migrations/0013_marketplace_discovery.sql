ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE marketplace_notices ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
UPDATE marketplace_notices SET categories=ARRAY[category] WHERE categories='{}';
ALTER TABLE marketplace_notices DROP CONSTRAINT IF EXISTS marketplace_categories_valid;
ALTER TABLE marketplace_notices ADD CONSTRAINT marketplace_categories_valid CHECK(cardinality(categories) BETWEEN 0 AND 3 AND categories <@ ARRAY['Food','Offers','Events','Services','Classes','Community','Ideas']::TEXT[]);
CREATE INDEX IF NOT EXISTS marketplace_notices_region_idx ON marketplace_notices(state,city,created_at DESC) WHERE status='approved';
INSERT INTO schema_migrations(version,applied_at) VALUES('0013_marketplace_discovery',CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;
