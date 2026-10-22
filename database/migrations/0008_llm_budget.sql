CREATE TABLE IF NOT EXISTS llm_call_budget (
  id TEXT PRIMARY KEY,
  day_key TEXT NOT NULL,
  month_key TEXT NOT NULL,
  daily_calls INTEGER NOT NULL CHECK (daily_calls >= 0),
  monthly_calls INTEGER NOT NULL CHECK (monthly_calls >= 0)
);
INSERT INTO schema_migrations(version, applied_at) VALUES ('0008_llm_budget', CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;
