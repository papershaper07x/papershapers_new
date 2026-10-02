import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const directory = path.resolve("database/migrations");
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    await sql.unsafe(await fs.readFile(path.join(directory, file), "utf8"));
    console.log(`Applied ${path.basename(file, ".sql")}`);
  }
} finally {
  await sql.end();
}
