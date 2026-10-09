-- Shared fixed-window limits survive serverless restarts. Keys are SHA-256 hashes.
CREATE TABLE IF NOT EXISTS request_limits (
  key_hash TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  request_count INTEGER NOT NULL
);
