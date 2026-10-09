import fs from "node:fs/promises";
import postgres from "postgres";

// A failed schema preparation stops the deploy and leaves the prior release live.
if (process.env.NETLIFY === "true" && process.env.REQUEST_LIMITS_ENABLED === "true") {
  const databaseUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("A database URL is required for the hosted request-limit migration.");
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 15 });
  try {
    await sql.unsafe(await fs.readFile(new URL("../database/migrations/0005_request_limits.sql", import.meta.url), "utf8"));
    const runtimeRole = decodeURIComponent(new URL(process.env.DATABASE_URL || databaseUrl).username);
    if (runtimeRole) await sql`GRANT SELECT, INSERT, UPDATE ON request_limits TO ${sql(runtimeRole)}`;
    console.log("Prepared shared request limits.");
  } finally { await sql.end(); }
}
