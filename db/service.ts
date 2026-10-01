import { getDb } from "./index";

export type PortalUser = { id: string; name: string; email: string; createdAt: string };
export type StudyRequest = { id: string; paper_id: string | null; subject: string; grade: string; focus: string; status: string; is_demo: number; created_at: string };
export type SavedItem = { id: string; portal: string; item_key: string; title: string; metadata: string; created_at: string };
export type CommunityPost = {
  id: string;
  author_id: string | null;
  author_label: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  status: "pending" | "published";
  is_internal: number;
  created_at: string;
  published_at: string | null;
};
export type TestRoom = { id: string; teacher_id: string; paper_id: string; status: string; created_at: string };
export type TestAttendee = { id: string; room_id: string; name: string; roll_number: string; status: string; options_filled: string | null; score: number | null; ai_evaluation: string | null; created_at: string };
export type UserRoleProfile = { role: "student" | "teacher"; institution: string; verified: boolean };


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
    `CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL, email TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_subject), UNIQUE(user_id, provider)
    )`,
    "CREATE INDEX IF NOT EXISTS auth_identities_provider_subject_idx ON auth_identities(provider, provider_subject)",
    `CREATE TABLE IF NOT EXISTS study_requests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, grade TEXT NOT NULL,
      focus TEXT NOT NULL, status TEXT NOT NULL, paper_id TEXT, is_demo INTEGER NOT NULL DEFAULT 0,
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
    `CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY, author_id TEXT, author_label TEXT NOT NULL, title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE, summary TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, published_at TEXT,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    "CREATE INDEX IF NOT EXISTS community_posts_status_published_idx ON community_posts(status, published_at DESC)",
    "CREATE INDEX IF NOT EXISTS community_posts_author_idx ON community_posts(author_id, created_at DESC)",
    `CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'student',
      institution TEXT, verified INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_rooms (
      id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, paper_id TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS test_attendees (
      id TEXT PRIMARY KEY, room_id TEXT NOT NULL, name TEXT NOT NULL, roll_number TEXT NOT NULL,
      status TEXT NOT NULL, options_filled TEXT, score INTEGER, ai_evaluation TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES test_rooms(id) ON DELETE CASCADE
    )`,
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));
  try {
    await db.prepare("ALTER TABLE test_attendees ADD COLUMN ai_evaluation TEXT").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE test_attendees ADD COLUMN score INTEGER").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE test_attendees ADD COLUMN options_filled TEXT").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE study_requests ADD COLUMN paper_id TEXT").run();
  } catch {}
  await seedCommunityGuides(db);
  schemaReady = true;
  return db;
}

const communityGuides = [
  {
    id: "guide-study-with-a-paper",
    slug: "a-calm-way-to-use-a-practice-paper",
    title: "A calm way to use a practice paper",
    summary: "A simple routine for turning one generated paper into a useful revision session.",
    body: "Start with one mapped chapter set instead of trying to revise everything at once. Read the instructions, set a realistic timer, and write your own answers before opening the review. When you finish, circle two things: a topic you knew and a topic to revisit tomorrow. That small loop makes a practice paper a plan, not just a score.",
  },
  {
    id: "guide-teacher-quick-practice",
    slug: "how-teachers-can-start-a-small-practice-loop",
    title: "How teachers can start a small practice loop",
    summary: "A low-pressure way to use a short paper as a conversation starter with a class or coaching group.",
    body: "Choose a narrow syllabus slice, make a short paper, and tell learners the purpose before they begin: this is practice, not a public ranking. After the attempt, look for patterns in the questions learners skipped or explained poorly. Use those patterns to plan the next explanation, not to label a learner.",
  },
  {
    id: "guide-what-the-system-does",
    slug: "what-happens-between-your-brief-and-your-paper",
    title: "What happens between your brief and your paper",
    summary: "A plain-language look at the safeguards around a generated Paper Shapers practice paper.",
    body: "Your class, subject, mapped chapters, paper size, and practice intent form a study brief. The generation service uses that brief with approved local curriculum metadata, then checks the returned paper structure and mark totals before it is shown. If every provider is unavailable, a recent matching validated paper may be used only as a recovery step. It is still saved privately to your study desk.",
  },
] as const;

async function seedCommunityGuides(db: Awaited<ReturnType<typeof getDb>>) {
  const publishedAt = "2026-09-29T00:00:00.000Z";
  await db.batch(communityGuides.map((post) => db.prepare(`INSERT OR IGNORE INTO community_posts
    (id, author_id, author_label, title, slug, summary, body, status, is_internal, created_at, published_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, 'published', 1, ?, ?)`)
    .bind(post.id, "Paper Shapers editorial team", post.title, post.slug, post.summary, post.body, publishedAt, publishedAt)));
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

export async function findUserByOAuthIdentity(provider: string, providerSubject: string): Promise<PortalUser | null> {
  const db = await ensureDatabase();
  const row = await db.prepare(`SELECT u.id, u.name, u.email, u.created_at
    FROM auth_identities identity JOIN users u ON u.id = identity.user_id
    WHERE identity.provider = ? AND identity.provider_subject = ? LIMIT 1`)
    .bind(provider, providerSubject).first<{ id: string; name: string; email: string; created_at: string }>();
  return row ? { id: row.id, name: row.name, email: row.email, createdAt: row.created_at } : null;
}

export async function linkOAuthIdentity(input: { userId: string; provider: string; providerSubject: string; email: string }) {
  const db = await ensureDatabase();
  await db.prepare(`INSERT OR IGNORE INTO auth_identities
    (id, user_id, provider, provider_subject, email, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), input.userId, input.provider, input.providerSubject, input.email, new Date().toISOString()).run();
  return findUserByOAuthIdentity(input.provider, input.providerSubject);
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

export async function addStudyRequest(userId: string, subject: string, grade: string, focus: string, status = "Brief ready", paperId?: string) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO study_requests (id, user_id, paper_id, subject, grade, focus, status, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)")
    .bind(id, userId, paperId ?? null, subject, grade, focus, status, createdAt).run();
  return { id, paper_id: paperId ?? null, subject, grade, focus, status, is_demo: 0, created_at: createdAt } satisfies StudyRequest;
}

export async function getStudyRequests(userId: string) {
  const db = await ensureDatabase();
  const result = await db.prepare("SELECT id, paper_id, subject, grade, focus, status, is_demo, created_at FROM study_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
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

export async function listPublishedCommunityPosts() {
  const db = await ensureDatabase();
  const result = await db.prepare(`SELECT id, author_id, author_label, title, slug, summary, body, status, is_internal, created_at, published_at
    FROM community_posts WHERE status = 'published' ORDER BY published_at DESC, created_at DESC LIMIT 36`).all<CommunityPost>();
  return result.results;
}

export async function getPublishedCommunityPost(slug: string) {
  const db = await ensureDatabase();
  return db.prepare(`SELECT id, author_id, author_label, title, slug, summary, body, status, is_internal, created_at, published_at
    FROM community_posts WHERE slug = ? AND status = 'published' LIMIT 1`).bind(slug).first<CommunityPost>();
}

function postSlug(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "student-note";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createCommunityPost(input: { authorId: string; authorLabel: string; title: string; summary: string; body: string }) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const slug = postSlug(input.title);
  await db.prepare(`INSERT INTO community_posts
    (id, author_id, author_label, title, slug, summary, body, status, is_internal, created_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL)`)
    .bind(id, input.authorId, input.authorLabel, input.title, slug, input.summary, input.body, createdAt).run();
  return { id, slug, createdAt };
}

export async function createTestRoom(teacherId: string, paperId: string) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO test_rooms (id, teacher_id, paper_id, status, created_at) VALUES (?, ?, ?, 'waiting', ?)")
    .bind(id, teacherId, paperId, createdAt).run();
  return { id, teacherId, paperId, status: "waiting", created_at: createdAt } satisfies TestRoom;
}

export async function getTestRoom(roomId: string) {
  const db = await ensureDatabase();
  return db.prepare("SELECT id, teacher_id, paper_id, status, created_at FROM test_rooms WHERE id = ?")
    .bind(roomId).first<TestRoom>();
}

export async function updateTestRoomStatus(roomId: string, status: string) {
  const db = await ensureDatabase();
  await db.prepare("UPDATE test_rooms SET status = ? WHERE id = ?").bind(status, roomId).run();
}

export async function getTeacherRooms(teacherId: string) {
  const db = await ensureDatabase();
  const result = await db.prepare("SELECT id, teacher_id, paper_id, status, created_at FROM test_rooms WHERE teacher_id = ? ORDER BY created_at DESC")
    .bind(teacherId).all<TestRoom>();
  return result.results;
}

export async function joinTestRoom(roomId: string, name: string, rollNumber: string) {
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO test_attendees (id, room_id, name, roll_number, status, created_at) VALUES (?, ?, ?, ?, 'joined', ?)")
    .bind(id, roomId, name, rollNumber, createdAt).run();
  return { id, room_id: roomId, name, roll_number: rollNumber, status: "joined", options_filled: null, score: null, ai_evaluation: null, created_at: createdAt } satisfies TestAttendee;
}

export async function getTestAttendees(roomId: string) {
  const db = await ensureDatabase();
  try {
    const result = await db.prepare("SELECT id, room_id, name, roll_number, status, options_filled, score, ai_evaluation, created_at FROM test_attendees WHERE room_id = ? ORDER BY created_at ASC")
      .bind(roomId).all<TestAttendee>();
    return result.results;
  } catch {
    try {
      await db.prepare("ALTER TABLE test_attendees ADD COLUMN ai_evaluation TEXT").run();
      const retryResult = await db.prepare("SELECT id, room_id, name, roll_number, status, options_filled, score, ai_evaluation, created_at FROM test_attendees WHERE room_id = ? ORDER BY created_at ASC")
        .bind(roomId).all<TestAttendee>();
      return retryResult.results;
    } catch {
      const fallbackResult = await db.prepare("SELECT id, room_id, name, roll_number, status, options_filled, score, created_at FROM test_attendees WHERE room_id = ? ORDER BY created_at ASC")
        .bind(roomId).all<Omit<TestAttendee, "ai_evaluation">>();
      return fallbackResult.results.map((r) => ({ ...r, ai_evaluation: null }));
    }
  }
}

export async function submitTestAttempt(attendeeId: string, optionsFilled: Record<string, string>, score: number | null) {
  const db = await ensureDatabase();
  await db.prepare("UPDATE test_attendees SET status = 'completed', options_filled = ?, score = ? WHERE id = ?")
    .bind(JSON.stringify(optionsFilled), score, attendeeId).run();
}

export async function updateAttendeeAiEvaluation(attendeeId: string, score: number, aiEvaluationJson: string) {
  const db = await ensureDatabase();
  await db.prepare("UPDATE test_attendees SET score = ?, ai_evaluation = ? WHERE id = ?")
    .bind(score, aiEvaluationJson, attendeeId).run();
}

export async function getUserRole(userId: string): Promise<UserRoleProfile> {
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT role, institution, verified FROM user_roles WHERE user_id = ?")
    .bind(userId).first<{ role: string; institution: string | null; verified: number }>();
  if (!row) {
    return { role: "student", institution: "", verified: false };
  }
  return {
    role: row.role === "teacher" ? "teacher" : "student",
    institution: row.institution || "",
    verified: Boolean(row.verified),
  };
}

export async function setUserRole(userId: string, role: "student" | "teacher", institution = "", verified = true) {
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  await db.prepare(`INSERT OR REPLACE INTO user_roles (user_id, role, institution, verified, updated_at)
    VALUES (?, ?, ?, ?, ?)`)
    .bind(userId, role, institution, verified ? 1 : 0, now).run();
}
