import { env } from "cloudflare:workers";

export function getDb(): D1Database {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Run through vinext/Miniflare locally or configure the production D1 binding."
    );
  }
  return env.DB as D1Database;
}
