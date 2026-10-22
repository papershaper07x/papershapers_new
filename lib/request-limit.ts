import { getDb } from "../db";
import { sha256 } from "./auth";

export async function withinRequestLimit(scope: string, identity: string, limit: number, windowSeconds: number, required = false) {
  // Optional burst limits are gated; mandatory AI admission always uses the store.
  if (!required && process.env.REQUEST_LIMITS_ENABLED !== "true") return true;
  const key = await sha256(`${scope}:${identity}`);
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const row = await getDb().prepare(`INSERT INTO request_limits (key_hash, window_start, request_count)
    VALUES (?, ?, 1) ON CONFLICT (key_hash) DO UPDATE SET
    request_count = CASE WHEN request_limits.window_start = excluded.window_start THEN request_limits.request_count + 1 ELSE 1 END,
    window_start = excluded.window_start
    WHERE request_limits.window_start <> excluded.window_start OR request_limits.request_count < ?
    RETURNING request_count`)
    .bind(key, windowStart, limit).first<{ request_count: number }>();
  return Boolean(row && row.request_count <= limit);
}

export function rateLimitResponse(seconds: number) {
  return Response.json({ error: "Too many requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(seconds) } });
}
