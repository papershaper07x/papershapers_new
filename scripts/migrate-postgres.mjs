import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const migrationUrl=process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required.");
if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production'&&process.env.PREVIEW_DATABASE_ISOLATED!=='true')throw new Error('Preview migrations require an isolated database.');
const sql = postgres(migrationUrl, { max: 1,connect_timeout:15 });
try {
  const directory = path.resolve("database/migrations");
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(72619044)`;
    for (const file of files) {
      await tx.unsafe(await fs.readFile(path.join(directory, file), "utf8"));
      console.log(`Prepared ${path.basename(file, ".sql")}`);
    }
  });
  console.log('Migration transaction committed. Apply reviewed runtime grants separately.');
} catch {
  console.error('Migration failed and was rolled back. Check owner credentials, connectivity and migration compatibility.');
  process.exitCode=1;
} finally {
  await sql.end();
}
