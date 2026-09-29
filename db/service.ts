import { getDb } from "./index";

export type PortalUser = { id: string; name: string; email: string; createdAt: string };
export type StudyRequest = { id: string; subject: string; grade: string; focus: string; status: string; is_demo: number; created_at: string };
export type SavedItem = { id: string; portal: string; item_key: string; title: string; metadata: string; created_at: string };

let schemaReady = false;

export async function ensureDatabase() {
  if (schemaReady) return getDb();
  const db = getDb();
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash)",
    `CREATE TABLE IF NOT EXISTS study_requests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, grade TEXT NOT NULL,
      focus TEXT NOT NULL, status TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS study_requests_user_idx ON study_requests(user_id, created_at DESC)",
    `CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY, news_topics TEXT NOT NULL, marketplace_interests TEXT NOT NULL,
      marketplace_area TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS saved_items (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, portal TEXT NOT NULL, item_key TEXT NOT NULL,
      title TEXT NOT NULL, metadata TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, portal, item_key)
    )`,
    "CREATE INDEX IF NOT EXISTS saved_items_user_portal_idx ON saved_items(user_id, portal, created_at DESC)",
    `CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL,
      topic TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
    )`,
    "CREATE INDEX IF NOT EXISTS contact_submissions_created_idx ON contact_submissions(created_at DESC)",
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));
  schemaReady = true;
  return db;
}

export async function createUser(input: { name: string; email: string; passwordHash: string; passwordSalt: string }) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, input.name, input.email, input.passwordHash, input.passwordSalt, now),
    db.prepare("INSERT INTO user_preferences (user_id, news_topics, marketplace_interests, marketplace_area, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, JSON.stringify(["India", "Policy", "Science"]), JSON.stringify(["Food", "Events", "Classes"]), "Indiranagar", now),
    db.prepare("INSERT INTO study_requests (id, user_id, subject, grade, focus, status, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
      .bind(crypto.randomUUID(), id, "Mathematics", "10", "Exam practice", "Sample brief", now),
    db.prepare("INSERT INTO saved_items (id, user_id, portal, item_key, title, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, "news", "sample-mobility", "The urban mobility briefing", JSON.stringify({ lens: "Centre brief", demo: true }), now),
    db.prepare("INSERT INTO saved_items (id, user_id, portal, item_key, title, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, "marketplace", "sample-pottery", "Weekend pottery circle", JSON.stringify({ area: "Ulsoor", demo: true }), now),
  ]);
  return { id, name: input.name, email: input.email, createdAt: now } satisfies PortalUser;
}

export async function findUserByEmail(email: string) {
  const db = await ensureDatabase();
  return db.prepare("SELECT id, name, email, password_hash, password_salt, created_at FROM users WHERE email = ? LIMIT 1")
    .bind(email).first<{ id: string; name: string; email: string; password_hash: string; password_salt: string; created_at: string }>();
}

export async function createSessionRecord(userId: string, tokenHash: string, expiresAt: string) {
  const db = await ensureDatabase();
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, new Date().toISOString()).run();
}

export async function deleteSession(tokenHash: string) {
  const db = await ensureDatabase();
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function findUserBySession(tokenHash: string): Promise<PortalUser | null> {
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  const row = await db.prepare(`SELECT u.id, u.name, u.email, u.created_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`).bind(tokenHash, now)
    .first<{ id: string; name: string; email: string; created_at: string }>();
  return row ? { id: row.id, name: row.name, email: row.email, createdAt: row.created_at } : null;
}

export async function addStudyRequest(userId: string, subject: string, grade: string, focus: string, status = "Brief ready") {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO study_requests (id, user_id, subject, grade, focus, status, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .bind(id, userId, subject, grade, focus, status, createdAt).run();
  return { id, subject, grade, focus, status, is_demo: 0, created_at: createdAt } satisfies StudyRequest;
}

export async function getStudyRequests(userId: string) {
  const db = await ensureDatabase();
  const result = await db.prepare("SELECT id, subject, grade, focus, status, is_demo, created_at FROM study_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
    .bind(userId).all<StudyRequest>();
  return result.results;
}

export async function getPreferences(userId: string) {
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT news_topics, marketplace_interests, marketplace_area FROM user_preferences WHERE user_id = ?")
    .bind(userId).first<{ news_topics: string; marketplace_interests: string; marketplace_area: string }>();
  return {
    newsTopics: JSON.parse(row?.news_topics ?? "[]") as string[],
    marketplaceInterests: JSON.parse(row?.marketplace_interests ?? "[]") as string[],
    marketplaceArea: row?.marketplace_area ?? "Indiranagar",
  };
}

export async function updatePreferences(userId: string, portal: "news" | "marketplace", values: string[], area?: string) {
  const db = await ensureDatabase();
  const column = portal === "news" ? "news_topics" : "marketplace_interests";
  const safeArea = area?.trim().slice(0, 80);
  if (portal === "marketplace" && safeArea) {
    await db.prepare(`UPDATE user_preferences SET ${column} = ?, marketplace_area = ?, updated_at = ? WHERE user_id = ?`)
      .bind(JSON.stringify(values), safeArea, new Date().toISOString(), userId).run();
  } else {
    await db.prepare(`UPDATE user_preferences SET ${column} = ?, updated_at = ? WHERE user_id = ?`)
      .bind(JSON.stringify(values), new Date().toISOString(), userId).run();
  }
}

export async function getSavedItems(userId: string, portal: "news" | "marketplace") {
  const db = await ensureDatabase();
  const result = await db.prepare("SELECT id, portal, item_key, title, metadata, created_at FROM saved_items WHERE user_id = ? AND portal = ? ORDER BY created_at DESC LIMIT 12")
    .bind(userId, portal).all<SavedItem>();
  return result.results;
}

export async function saveItem(userId: string, portal: "news" | "marketplace", itemKey: string, title: string, metadata: Record<string, unknown>) {
  const db = await ensureDatabase();
  await db.prepare("INSERT OR IGNORE INTO saved_items (id, user_id, portal, item_key, title, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, portal, itemKey.slice(0, 100), title.slice(0, 180), JSON.stringify(metadata), new Date().toISOString()).run();
}

export async function createContactSubmission(input: { name: string; email: string; role: string; topic: string; message: string }) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO contact_submissions (id, name, email, role, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, input.name, input.email, input.role, input.topic, input.message, createdAt).run();
  return { id, createdAt };
}
