CREATE INDEX IF NOT EXISTS marketplace_public_recent_idx ON marketplace_notices (created_at DESC,id) WHERE status='approved';
CREATE INDEX IF NOT EXISTS generated_papers_pending_jobs_idx ON generated_papers (created_at,id) WHERE status='job-queued' OR status LIKE 'job-running:%';
INSERT INTO schema_migrations(version,applied_at) VALUES ('0011_resource_limits',CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;
