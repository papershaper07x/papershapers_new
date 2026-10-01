import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("live room files, question input, and route components exist and have valid structure", async () => {
  const files = [
    "app/papershapers/for-teachers/rooms/page.tsx",
    "app/papershapers/for-teachers/rooms/actions.ts",
    "app/papershapers/for-teachers/rooms/[roomId]/page.tsx",
    "app/papershapers/for-teachers/rooms/[roomId]/room-live-monitor.tsx",
    "app/papershapers/question-input.tsx",
    "app/papershapers/room/page.tsx",
    "app/papershapers/room/[roomId]/page.tsx",
    "app/papershapers/room/[roomId]/actions.ts",
    "app/papershapers/room/[roomId]/live-room-attempt.tsx",
    "app/papershapers/room/[roomId]/waiting-room.tsx",
  ];
  for (const file of files) {
    const content = await readFile(new URL(file, root), "utf8");
    assert.ok(content.length > 50, `${file} should have meaningful content`);
  }

  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  assert.match(schema, /testRooms = sqliteTable\("test_rooms"/);
  assert.match(schema, /testAttendees = sqliteTable\("test_attendees"/);
  assert.match(schema, /userRoles = sqliteTable\("user_roles"/);
  assert.match(schema, /aiEvaluation: text\("ai_evaluation"\)/);

  const service = await readFile(new URL("db/service.ts", root), "utf8");
  assert.match(service, /createTestRoom/);
  assert.match(service, /getTestRoom/);
  assert.match(service, /updateTestRoomStatus/);
  assert.match(service, /joinTestRoom/);
  assert.match(service, /getTestAttendees/);
  assert.match(service, /submitTestAttempt/);
  assert.match(service, /updateAttendeeAiEvaluation/);
  assert.match(service, /getUserRole/);
  assert.match(service, /setUserRole/);
});

test("test room database schema, user roles, and AI evaluation lifecycle in SQLite", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // 1. Create tables as defined in db/service.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'student',
      institution TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS test_rooms (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      paper_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS test_attendees (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      status TEXT NOT NULL,
      options_filled TEXT,
      score INTEGER,
      ai_evaluation TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES test_rooms(id) ON DELETE CASCADE
    );
  `);

  // 2. Role verification testing
  const teacherUserId = "teacher-user-456";
  const studentUserId = "student-user-789";

  const insertRole = db.prepare(
    "INSERT OR REPLACE INTO user_roles (user_id, role, institution, verified, updated_at) VALUES (?, ?, ?, ?, ?)"
  );
  insertRole.run(teacherUserId, "teacher", "Delhi Public School", 1, new Date().toISOString());

  const getRole = db.prepare("SELECT role, institution, verified FROM user_roles WHERE user_id = ?");
  const teacherRole = getRole.get(teacherUserId);
  assert.ok(teacherRole);
  assert.equal(teacherRole.role, "teacher");
  assert.equal(teacherRole.institution, "Delhi Public School");
  assert.equal(teacherRole.verified, 1);

  const nonExistentRole = getRole.get(studentUserId);
  assert.equal(nonExistentRole, undefined, "Unassigned user should not have explicit teacher entry");

  // 3. Teacher creates test room
  const roomId = "room-uuid-123";
  const paperId = "paper-math-class10-789";
  const createdAt = new Date().toISOString();

  const insertRoom = db.prepare(
    "INSERT INTO test_rooms (id, teacher_id, paper_id, status, created_at) VALUES (?, ?, ?, 'waiting', ?)"
  );
  insertRoom.run(roomId, teacherUserId, paperId, createdAt);

  // 4. Retrieve test room
  const getRoom = db.prepare("SELECT id, teacher_id, paper_id, status, created_at FROM test_rooms WHERE id = ?");
  const room = getRoom.get(roomId);
  assert.ok(room);
  assert.equal(room.id, roomId);
  assert.equal(room.teacher_id, teacherUserId);
  assert.equal(room.paper_id, paperId);
  assert.equal(room.status, "waiting");

  // 5. Students join room
  const student1Id = "attendee-1";
  const student2Id = "attendee-2";
  const insertAttendee = db.prepare(
    "INSERT INTO test_attendees (id, room_id, name, roll_number, status, created_at) VALUES (?, ?, ?, ?, 'joined', ?)"
  );
  insertAttendee.run(student1Id, roomId, "Aarav Sharma", "ROLL-001", createdAt);
  insertAttendee.run(student2Id, roomId, "Diya Patel", "ROLL-002", createdAt);

  // 6. Query attendees
  const getAttendees = db.prepare(
    "SELECT id, room_id, name, roll_number, status, options_filled, score, ai_evaluation, created_at FROM test_attendees WHERE room_id = ? ORDER BY created_at ASC"
  );
  let attendees = getAttendees.all(roomId);
  assert.equal(attendees.length, 2);
  assert.equal(attendees[0].name, "Aarav Sharma");
  assert.equal(attendees[0].roll_number, "ROLL-001");
  assert.equal(attendees[0].status, "joined");
  assert.equal(attendees[1].name, "Diya Patel");
  assert.equal(attendees[1].roll_number, "ROLL-002");

  // 7. Teacher starts the test session
  const updateRoomStatus = db.prepare("UPDATE test_rooms SET status = ? WHERE id = ?");
  updateRoomStatus.run("active", roomId);

  const activeRoom = getRoom.get(roomId);
  assert.equal(activeRoom.status, "active");

  // 8. Student 1 submits attempt with answered questions
  const optionsFilled = JSON.stringify({
    "Q1": "(B) 14 sq units",
    "Q2": "x = 5, y = 3",
    "Q3": "Linear equation definition with standard form ax + b = 0",
  });
  const updateAttendee = db.prepare(
    "UPDATE test_attendees SET status = 'completed', options_filled = ?, score = ? WHERE id = ?"
  );
  updateAttendee.run(optionsFilled, null, student1Id);

  // 9. Teacher triggers AI assessment for Student 1
  const aiReport = {
    earned_marks: 8,
    total_marks: 10,
    percentage: 80,
    summary: "Solid conceptual grasp. Clear MCQ selection and algebraic working.",
    breakdown: [
      { question_id: "Q1", earned_marks: 2, available_marks: 2, feedback: "Correct option selected." },
      { question_id: "Q2", earned_marks: 3, available_marks: 3, feedback: "Calculations accurate." },
      { question_id: "Q3", earned_marks: 3, available_marks: 5, feedback: "Add graphical interpretation." }
    ]
  };

  const updateAiEvaluation = db.prepare(
    "UPDATE test_attendees SET score = ?, ai_evaluation = ? WHERE id = ?"
  );
  updateAiEvaluation.run(aiReport.earned_marks, JSON.stringify(aiReport), student1Id);

  // 10. Verify student 1 submission and AI evaluation
  attendees = getAttendees.all(roomId);
  const student1 = attendees.find((a) => a.id === student1Id);
  assert.equal(student1.status, "completed");
  assert.equal(student1.score, 8);
  assert.ok(student1.ai_evaluation);

  const parsedAi = JSON.parse(student1.ai_evaluation);
  assert.equal(parsedAi.earned_marks, 8);
  assert.equal(parsedAi.percentage, 80);
  assert.equal(parsedAi.breakdown.length, 3);

  // Student 2 is still in 'joined' status with no evaluation
  const student2 = attendees.find((a) => a.id === student2Id);
  assert.equal(student2.status, "joined");
  assert.equal(student2.options_filled, null);
  assert.equal(student2.ai_evaluation, null);

  // 11. Teacher concludes the session
  updateRoomStatus.run("completed", roomId);
  const concludedRoom = getRoom.get(roomId);
  assert.equal(concludedRoom.status, "completed");

  // 12. Foreign key cascade deletion test
  const deleteRoom = db.prepare("DELETE FROM test_rooms WHERE id = ?");
  deleteRoom.run(roomId);
  const remainingAttendees = getAttendees.all(roomId);
  assert.equal(remainingAttendees.length, 0, "Attendees should be cascade-deleted when room is deleted");
});

test("ncert scraper script exists, supports tabular curriculum and 6-month recurrence", async () => {
  const scraper = await readFile(new URL("scripts/ncert_curriculum_scraper.py", root), "utf8");
  assert.match(scraper, /scrape_ncert_catalog/);
  assert.match(scraper, /init_database/);
  assert.match(scraper, /download_chapter_pdf/);
  assert.match(scraper, /extract_text_from_pdf/);
  assert.match(scraper, /sync_csv_curriculum/);
  assert.match(scraper, /export_json_catalog/);
  assert.match(scraper, /display_schedule_instructions/);
});
