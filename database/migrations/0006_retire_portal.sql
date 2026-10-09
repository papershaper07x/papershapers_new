-- One-time removal of retired storage from existing installations.
DROP TABLE IF EXISTS news_story_review_events;
DROP TABLE IF EXISTS news_story_members;
DROP TABLE IF EXISTS news_ingestion_runs;
DROP TABLE IF EXISTS news_story_clusters;
DROP TABLE IF EXISTS news_source_documents;
DROP TABLE IF EXISTS news_perspectives;
DROP TABLE IF EXISTS news_articles;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS news_topics;
DELETE FROM saved_items WHERE portal = 'news';
DELETE FROM schema_migrations WHERE version IN ('0002_news_pipeline', '0003_news_ingestion_runs', '0004_news_editorial_events');
INSERT INTO schema_migrations (version, applied_at) VALUES ('0006_retire_portal', CURRENT_TIMESTAMP::TEXT) ON CONFLICT (version) DO NOTHING;
